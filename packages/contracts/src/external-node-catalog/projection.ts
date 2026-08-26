import type {
  NodeTypeCatalogContribution,
  NodeTypeDescriptor,
  NodeTypeRef,
} from '../graph-authoring/types';
import {
  nodeTypeRefKey,
  validateNodeTypeDescriptor,
  type NodeTypeValidationIssue,
} from '../graph-authoring/validation';
import {
  createStrictPortableDataBudget,
  snapshotStrictPortableData,
  StrictPortableDataError,
} from '../internal/strict-portable-data';
import {
  collectNoncanonicalUiValueSchemaText,
  isSupportedUiValueSchemaShape,
} from '../internal/ui-value-schema-shape';
import type { UiValueSchema } from '../ui-authoring/types';
import {
  EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS,
  EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION,
  type ExternalNodeCatalogProjectionAcceptance,
  type ExternalNodeCatalogProjectionIssue,
  type ExternalNodeCatalogProjectionResult,
  type ExternalNodeFixedInputSnapshot,
  type ExternalNodeFixedOutputSnapshot,
  type ExternalStaticNodeCatalogEntry,
} from './types';

type PlainRecord = Readonly<Record<string, unknown>>;

interface RowSlot {
  readonly index: number;
  readonly path: string;
  readonly hostile: boolean;
  readonly value?: unknown;
}

interface Envelope {
  readonly record: PlainRecord;
  readonly values: Readonly<Record<string, unknown>>;
}

interface ParsedIdentityRow {
  readonly index: number;
  readonly key?: string;
  readonly target?: NodeTypeRef;
  readonly invalid: boolean;
}

interface ParsedValueRow {
  readonly index: number;
  readonly key?: string;
  readonly target?: UiValueSchema;
  readonly invalid: boolean;
}

interface ParsedSourceRow {
  readonly index: number;
  readonly key?: string;
  readonly entry?: PlainRecord;
  readonly staticEntry?: ExternalStaticNodeCatalogEntry;
  readonly issues: ExternalNodeCatalogProjectionIssue[];
}

interface DescriptorCandidate {
  readonly source: ParsedSourceRow;
  readonly target: NodeTypeRef;
  readonly descriptor: NodeTypeDescriptor;
}

const EMPTY_ACCEPTED = Object.freeze([]) as readonly [];
const EMPTY_ISSUES = Object.freeze([]) as readonly [];
const ISSUE_ORDER = new Map<string, number>([
  ['unsupported-schema-version', 0],
  ['invalid-foreign-snapshot', 1],
  ['invalid-foreign-entry', 2],
  ['invalid-projection-mapping', 3],
  ['admission-limit-exceeded', 4],
  ['duplicate-source-type-key', 5],
  ['duplicate-identity-mapping', 6],
  ['missing-identity-mapping', 7],
  ['duplicate-value-semantic-mapping', 8],
  ['missing-value-semantic-mapping', 9],
  ['duplicate-projected-node-ref', 10],
  ['unsupported-foreign-input', 11],
  ['unsupported-foreign-output', 12],
  ['unsupported-dynamic-shape', 13],
  ['unsafe-foreign-entry', 14],
  ['projected-descriptor-invalid', 15],
]);

function hasOwn(record: PlainRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function isPlainRecord(value: unknown): value is PlainRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(record: PlainRecord, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  const ownKeys = Reflect.ownKeys(record);
  return (
    ownKeys.length === Object.keys(record).length &&
    ownKeys.every((key) => typeof key === 'string' && allowed.has(key))
  );
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function optionalCanonicalText(record: PlainRecord, key: string): boolean {
  return !hasOwn(record, key) || isCanonicalText(record[key]);
}

function inspectEnvelope(value: unknown, keys: readonly string[]): Envelope | null {
  if (!isPlainRecord(value)) return null;
  const values: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== 'string')) return null;
  const allowed = new Set(keys);
  for (const key of ownKeys as string[]) {
    if (!allowed.has(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
      descriptor.enumerable !== true
    ) {
      return null;
    }
    values[key] = descriptor.value;
  }
  return { record: value, values: Object.freeze(values) };
}

function inspectRowArray(value: unknown, path: string): readonly RowSlot[] | null {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  if (
    lengthDescriptor === undefined ||
    !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value') ||
    typeof lengthDescriptor.value !== 'number' ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    return null;
  }
  const length = lengthDescriptor.value;
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') continue;
    if (
      typeof key !== 'string' ||
      !/^(0|[1-9]\d*)$/.test(key) ||
      Number(key) >= length ||
      String(Number(key)) !== key
    ) {
      return null;
    }
  }
  return Object.freeze(
    Array.from({ length }, (_, index): RowSlot => {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      const rowPath = `${path}[${index}]`;
      if (
        descriptor === undefined ||
        !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
        descriptor.enumerable !== true
      ) {
        return Object.freeze({ index, path: rowPath, hostile: true });
      }
      return Object.freeze({ index, path: rowPath, hostile: false, value: descriptor.value });
    }),
  );
}

function issue(
  code: ExternalNodeCatalogProjectionIssue['code'],
  message: string,
  path: string,
  evidence: {
    readonly sourceIndex?: number;
    readonly sourceTypeKey?: string;
    readonly mappingIndex?: number;
    readonly nodeIssue?: NodeTypeValidationIssue;
  } = {},
): ExternalNodeCatalogProjectionIssue {
  return Object.freeze({ code, message, path, ...evidence }) as ExternalNodeCatalogProjectionIssue;
}

function invalidResult(
  code: 'invalid-foreign-snapshot' | 'invalid-projection-mapping' | 'admission-limit-exceeded',
  path: string,
): ExternalNodeCatalogProjectionResult {
  return Object.freeze({
    status: 'invalid',
    accepted: EMPTY_ACCEPTED,
    issues: Object.freeze([
      issue(
        code,
        code === 'admission-limit-exceeded'
          ? 'The external node catalog projection exceeds a frozen admission limit.'
          : code === 'invalid-foreign-snapshot'
            ? 'The external node catalog snapshot must use the supported plain-data envelope.'
            : 'The external node catalog mapping must use the supported plain-data envelope.',
        path,
      ),
    ]),
  }) as ExternalNodeCatalogProjectionResult;
}

function unsupportedVersionResult(path: string): ExternalNodeCatalogProjectionResult {
  return Object.freeze({
    status: 'unsupported-version',
    accepted: EMPTY_ACCEPTED,
    issues: Object.freeze([
      issue(
        'unsupported-schema-version',
        'The external node catalog projection schema version is unsupported.',
        path,
      ),
    ]),
  }) as ExternalNodeCatalogProjectionResult;
}

function mappingIssue(
  code:
    | 'invalid-projection-mapping'
    | 'duplicate-identity-mapping'
    | 'duplicate-value-semantic-mapping',
  index: number,
  path: string,
): ExternalNodeCatalogProjectionIssue {
  const messages = {
    'invalid-projection-mapping': 'The projection mapping row is invalid.',
    'duplicate-identity-mapping': 'The source type key has duplicate identity mappings.',
    'duplicate-value-semantic-mapping': 'The source semantic ID has duplicate value mappings.',
  } as const;
  return issue(code, messages[code], path, { mappingIndex: index });
}

function sourceIssue(
  code:
    | 'invalid-foreign-entry'
    | 'unsafe-foreign-entry'
    | 'duplicate-source-type-key'
    | 'missing-identity-mapping'
    | 'missing-value-semantic-mapping'
    | 'duplicate-projected-node-ref'
    | 'unsupported-foreign-input'
    | 'unsupported-foreign-output'
    | 'unsupported-dynamic-shape',
  source: Pick<ParsedSourceRow, 'index' | 'key'>,
  path: string,
): ExternalNodeCatalogProjectionIssue {
  const messages = {
    'invalid-foreign-entry': 'The external node catalog entry has an invalid closed shape.',
    'unsafe-foreign-entry': 'The external node catalog entry contains unsupported data.',
    'duplicate-source-type-key': 'The source type key is duplicated.',
    'missing-identity-mapping': 'The source type key has no exact identity mapping.',
    'missing-value-semantic-mapping': 'A fixed port has no exact value-semantic mapping.',
    'duplicate-projected-node-ref': 'Multiple eligible entries project to the same exact node ref.',
    'unsupported-foreign-input': 'Dynamic external inputs are unsupported in projection v1.',
    'unsupported-foreign-output': 'Dynamic external outputs are unsupported in projection v1.',
    'unsupported-dynamic-shape': 'Dynamic external node entries are unsupported in projection v1.',
  } as const;
  return issue(code, messages[code], path, {
    sourceIndex: source.index,
    ...(code === 'invalid-foreign-entry' || code === 'unsafe-foreign-entry'
      ? {}
      : { sourceTypeKey: source.key }),
  });
}

function descriptorIssue(
  source: Pick<ParsedSourceRow, 'index' | 'key'>,
  nested: NodeTypeValidationIssue,
): ExternalNodeCatalogProjectionIssue {
  return issue(
    'projected-descriptor-invalid',
    'The projected canonical node descriptor is invalid.',
    `snapshot.entries[${source.index}].${nested.path}`,
    {
      sourceIndex: source.index,
      sourceTypeKey: source.key,
      nodeIssue: Object.freeze({ ...nested }),
    },
  );
}

function isNodeRef(value: unknown): value is NodeTypeRef {
  return (
    isPlainRecord(value) &&
    hasOnlyKeys(value, ['id', 'version']) &&
    isCanonicalText(value.id) &&
    isCanonicalText(value.version)
  );
}

function isDesignTime(value: unknown, dynamic: boolean): boolean {
  if (!isPlainRecord(value)) return false;
  const keys = dynamic
    ? ['label', 'description', 'category']
    : ['label', 'description', 'category', 'icon', 'tags', 'hiddenFromPalette'];
  if (!hasOnlyKeys(value, keys) || !isCanonicalText(value.label)) return false;
  if (
    !optionalCanonicalText(value, 'description') ||
    !optionalCanonicalText(value, 'category') ||
    (!dynamic && !optionalCanonicalText(value, 'icon'))
  ) {
    return false;
  }
  if (
    !dynamic &&
    hasOwn(value, 'tags') &&
    (!Array.isArray(value.tags) || !value.tags.every(isCanonicalText))
  ) {
    return false;
  }
  return !(
    !dynamic &&
    hasOwn(value, 'hiddenFromPalette') &&
    typeof value.hiddenFromPalette !== 'boolean'
  );
}

function isFixedInput(value: unknown): value is ExternalNodeFixedInputSnapshot {
  return (
    isPlainRecord(value) &&
    value.kind === 'fixed' &&
    hasOnlyKeys(value, ['kind', 'id', 'label', 'description', 'required', 'valueSemanticId']) &&
    isCanonicalText(value.id) &&
    optionalCanonicalText(value, 'label') &&
    optionalCanonicalText(value, 'description') &&
    (!hasOwn(value, 'required') || typeof value.required === 'boolean') &&
    isCanonicalText(value.valueSemanticId)
  );
}

function isFixedOutput(value: unknown): value is ExternalNodeFixedOutputSnapshot {
  return (
    isPlainRecord(value) &&
    value.kind === 'fixed' &&
    hasOnlyKeys(value, ['kind', 'id', 'label', 'description', 'valueSemanticId']) &&
    isCanonicalText(value.id) &&
    optionalCanonicalText(value, 'label') &&
    optionalCanonicalText(value, 'description') &&
    isCanonicalText(value.valueSemanticId)
  );
}

function isDynamicInput(value: unknown): boolean {
  return (
    isPlainRecord(value) &&
    value.kind === 'dynamic' &&
    hasOnlyKeys(value, ['kind', 'id', 'label', 'description']) &&
    isCanonicalText(value.id) &&
    optionalCanonicalText(value, 'label') &&
    optionalCanonicalText(value, 'description')
  );
}

function isDynamicOutput(value: unknown): boolean {
  return isDynamicInput(value);
}

function parseSourceEntry(value: unknown, index: number): ParsedSourceRow {
  const base = { index, issues: [] as ExternalNodeCatalogProjectionIssue[] };
  if (!isPlainRecord(value) || !isCanonicalText(value.sourceTypeKey)) {
    return {
      ...base,
      issues: [sourceIssue('invalid-foreign-entry', { index }, `snapshot.entries[${index}]`)],
    };
  }
  if (value.kind === 'dynamic') {
    if (
      !hasOnlyKeys(value, ['kind', 'sourceTypeKey', 'designTime']) ||
      !isDesignTime(value.designTime, true)
    ) {
      return {
        ...base,
        issues: [sourceIssue('invalid-foreign-entry', { index }, `snapshot.entries[${index}]`)],
      };
    }
    return {
      ...base,
      key: value.sourceTypeKey,
      entry: value,
      issues: [
        sourceIssue(
          'unsupported-dynamic-shape',
          { index, key: value.sourceTypeKey },
          `snapshot.entries[${index}].kind`,
        ),
      ],
    };
  }
  if (
    value.kind !== 'static' ||
    !hasOnlyKeys(value, ['kind', 'sourceTypeKey', 'inputs', 'outputs', 'designTime']) ||
    !Array.isArray(value.inputs) ||
    !Array.isArray(value.outputs) ||
    !isDesignTime(value.designTime, false)
  ) {
    return {
      ...base,
      issues: [sourceIssue('invalid-foreign-entry', { index }, `snapshot.entries[${index}]`)],
    };
  }
  const issues: ExternalNodeCatalogProjectionIssue[] = [];
  value.inputs.forEach((input, portIndex) => {
    if (isDynamicInput(input)) {
      issues.push(
        sourceIssue(
          'unsupported-foreign-input',
          { index, key: value.sourceTypeKey as string },
          `snapshot.entries[${index}].inputs[${portIndex}]`,
        ),
      );
    } else if (!isFixedInput(input)) {
      issues.push(sourceIssue('invalid-foreign-entry', { index }, `snapshot.entries[${index}]`));
    }
  });
  value.outputs.forEach((output, portIndex) => {
    if (isDynamicOutput(output)) {
      issues.push(
        sourceIssue(
          'unsupported-foreign-output',
          { index, key: value.sourceTypeKey as string },
          `snapshot.entries[${index}].outputs[${portIndex}]`,
        ),
      );
    } else if (!isFixedOutput(output)) {
      issues.push(sourceIssue('invalid-foreign-entry', { index }, `snapshot.entries[${index}]`));
    }
  });
  return {
    index,
    key: value.sourceTypeKey,
    entry: value,
    staticEntry: value as unknown as ExternalStaticNodeCatalogEntry,
    issues,
  };
}

function sortSourceIssues(
  issues: readonly ExternalNodeCatalogProjectionIssue[],
): ExternalNodeCatalogProjectionIssue[] {
  return [...issues].sort(
    (left, right) => (ISSUE_ORDER.get(left.code) ?? 99) - (ISSUE_ORDER.get(right.code) ?? 99),
  );
}

function freezeContribution(
  contributorId: string,
  nodeTypes: readonly NodeTypeDescriptor[],
): NodeTypeCatalogContribution {
  return Object.freeze({ contributorId, nodeTypes: Object.freeze([...nodeTypes]) });
}

function createDescriptor(
  source: ParsedSourceRow & { readonly staticEntry: ExternalStaticNodeCatalogEntry },
  target: NodeTypeRef,
  values: ReadonlyMap<string, UiValueSchema>,
): NodeTypeDescriptor {
  const inputs = Object.freeze(
    source.staticEntry.inputs.map((input) => {
      const fixed = input as ExternalNodeFixedInputSnapshot;
      return Object.freeze({
        id: fixed.id,
        ...(fixed.label === undefined ? {} : { label: fixed.label }),
        ...(fixed.description === undefined ? {} : { description: fixed.description }),
        ...(fixed.required === undefined ? {} : { required: fixed.required }),
        value: values.get(fixed.valueSemanticId)!,
      });
    }),
  );
  const outputs = Object.freeze(
    source.staticEntry.outputs.map((output) => {
      const fixed = output as ExternalNodeFixedOutputSnapshot;
      return Object.freeze({
        id: fixed.id,
        ...(fixed.label === undefined ? {} : { label: fixed.label }),
        ...(fixed.description === undefined ? {} : { description: fixed.description }),
        value: values.get(fixed.valueSemanticId)!,
      });
    }),
  );
  return Object.freeze({
    id: target.id,
    version: target.version,
    inputs,
    outputs,
    designTime: source.staticEntry.designTime,
  });
}

function projectAdmittedRows(
  entries: readonly RowSlot[],
  identities: readonly RowSlot[],
  values: readonly RowSlot[],
  contributorId: string,
  propertyBudgetLimit: number,
): ExternalNodeCatalogProjectionResult {
  const budget = createStrictPortableDataBudget(propertyBudgetLimit);
  const snapshotOptions = {
    maxDepth: EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxPortableDepth,
    maxStringLength: EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxStringLength,
    budget,
  } as const;
  const identityRows: ParsedIdentityRow[] = [];
  const valueRows: ParsedValueRow[] = [];
  const mappingIssues: ExternalNodeCatalogProjectionIssue[] = [];

  try {
    for (const slot of identities) {
      if (slot.hostile) {
        identityRows.push({ index: slot.index, invalid: true });
        continue;
      }
      try {
        const row = snapshotStrictPortableData(slot.value, { ...snapshotOptions, path: slot.path });
        const key =
          isPlainRecord(row) && isCanonicalText(row.sourceTypeKey) ? row.sourceTypeKey : undefined;
        const valid =
          isPlainRecord(row) &&
          hasOnlyKeys(row, ['sourceTypeKey', 'target']) &&
          key !== undefined &&
          isNodeRef(row.target);
        identityRows.push({
          index: slot.index,
          ...(key === undefined ? {} : { key }),
          ...(valid ? { target: row.target as NodeTypeRef } : {}),
          invalid: !valid,
        });
      } catch (error) {
        if (error instanceof StrictPortableDataError && error.kind === 'limit') throw error;
        identityRows.push({ index: slot.index, invalid: true });
      }
    }
    for (const slot of values) {
      if (slot.hostile) {
        valueRows.push({ index: slot.index, invalid: true });
        continue;
      }
      try {
        const row = snapshotStrictPortableData(slot.value, { ...snapshotOptions, path: slot.path });
        const key =
          isPlainRecord(row) && isCanonicalText(row.sourceSemanticId)
            ? row.sourceSemanticId
            : undefined;
        const valid =
          isPlainRecord(row) &&
          hasOnlyKeys(row, ['sourceSemanticId', 'target']) &&
          key !== undefined &&
          isSupportedUiValueSchemaShape(row.target) &&
          collectNoncanonicalUiValueSchemaText(row.target).length === 0;
        valueRows.push({
          index: slot.index,
          ...(key === undefined ? {} : { key }),
          ...(valid ? { target: row.target as UiValueSchema } : {}),
          invalid: !valid,
        });
      } catch (error) {
        if (error instanceof StrictPortableDataError && error.kind === 'limit') throw error;
        valueRows.push({ index: slot.index, invalid: true });
      }
    }
  } catch (error) {
    if (error instanceof StrictPortableDataError && error.kind === 'limit') {
      return invalidResult('admission-limit-exceeded', error.path);
    }
    throw error;
  }

  const identityCounts = new Map<string, number>();
  const valueCounts = new Map<string, number>();
  for (const row of identityRows) {
    if (row.key !== undefined) identityCounts.set(row.key, (identityCounts.get(row.key) ?? 0) + 1);
  }
  for (const row of valueRows) {
    if (row.key !== undefined) valueCounts.set(row.key, (valueCounts.get(row.key) ?? 0) + 1);
  }
  for (const row of identityRows) {
    if (row.invalid) {
      mappingIssues.push(
        mappingIssue('invalid-projection-mapping', row.index, `mapping.identities[${row.index}]`),
      );
    }
    if (row.key !== undefined && (identityCounts.get(row.key) ?? 0) > 1) {
      mappingIssues.push(
        mappingIssue('duplicate-identity-mapping', row.index, `mapping.identities[${row.index}]`),
      );
    }
  }
  for (const row of valueRows) {
    if (row.invalid) {
      mappingIssues.push(
        mappingIssue('invalid-projection-mapping', row.index, `mapping.values[${row.index}]`),
      );
    }
    if (row.key !== undefined && (valueCounts.get(row.key) ?? 0) > 1) {
      mappingIssues.push(
        mappingIssue('duplicate-value-semantic-mapping', row.index, `mapping.values[${row.index}]`),
      );
    }
  }
  const identityMap = new Map<string, NodeTypeRef>();
  const valueMap = new Map<string, UiValueSchema>();
  for (const row of identityRows) {
    if (
      !row.invalid &&
      row.key !== undefined &&
      row.target !== undefined &&
      identityCounts.get(row.key) === 1
    ) {
      identityMap.set(row.key, row.target);
    }
  }
  for (const row of valueRows) {
    if (
      !row.invalid &&
      row.key !== undefined &&
      row.target !== undefined &&
      valueCounts.get(row.key) === 1
    ) {
      valueMap.set(row.key, row.target);
    }
  }

  const sources: ParsedSourceRow[] = [];
  try {
    for (const slot of entries) {
      if (slot.hostile) {
        sources.push({
          index: slot.index,
          issues: [sourceIssue('unsafe-foreign-entry', { index: slot.index }, slot.path)],
        });
        continue;
      }
      try {
        const row = snapshotStrictPortableData(slot.value, { ...snapshotOptions, path: slot.path });
        const parsed = parseSourceEntry(row, slot.index);
        if (
          parsed.staticEntry !== undefined &&
          parsed.staticEntry.inputs.length + parsed.staticEntry.outputs.length >
            EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxPortsPerEntry
        ) {
          return invalidResult('admission-limit-exceeded', slot.path);
        }
        sources.push(parsed);
      } catch (error) {
        if (error instanceof StrictPortableDataError && error.kind === 'limit') throw error;
        sources.push({
          index: slot.index,
          issues: [sourceIssue('unsafe-foreign-entry', { index: slot.index }, slot.path)],
        });
      }
    }
  } catch (error) {
    if (error instanceof StrictPortableDataError && error.kind === 'limit') {
      return invalidResult('admission-limit-exceeded', error.path);
    }
    throw error;
  }

  const sourceCounts = new Map<string, number>();
  for (const source of sources) {
    if (source.key !== undefined) {
      sourceCounts.set(source.key, (sourceCounts.get(source.key) ?? 0) + 1);
    }
  }
  const preliminary: DescriptorCandidate[] = [];
  for (const source of sources) {
    if (source.key === undefined) continue;
    if ((sourceCounts.get(source.key) ?? 0) > 1) {
      source.issues.push(
        sourceIssue(
          'duplicate-source-type-key',
          source,
          `snapshot.entries[${source.index}].sourceTypeKey`,
        ),
      );
    }
    if (source.staticEntry === undefined) continue;
    if (source.issues.length > 0) continue;
    const target = identityMap.get(source.key);
    if (target === undefined) {
      if (!identityCounts.has(source.key)) {
        source.issues.push(
          sourceIssue(
            'missing-identity-mapping',
            source,
            `snapshot.entries[${source.index}].sourceTypeKey`,
          ),
        );
      }
      continue;
    }
    const requiredValueKeys = new Set([
      ...source.staticEntry.inputs.map(
        (entry) => (entry as ExternalNodeFixedInputSnapshot).valueSemanticId,
      ),
      ...source.staticEntry.outputs.map(
        (entry) => (entry as ExternalNodeFixedOutputSnapshot).valueSemanticId,
      ),
    ]);
    for (const valueKey of requiredValueKeys) {
      if (!valueMap.has(valueKey) && !valueCounts.has(valueKey)) {
        source.issues.push(
          sourceIssue(
            'missing-value-semantic-mapping',
            source,
            `snapshot.entries[${source.index}]`,
          ),
        );
      }
    }
    if (source.issues.length > 0) continue;
    const allMapped = [
      ...source.staticEntry.inputs.map(
        (entry) => (entry as ExternalNodeFixedInputSnapshot).valueSemanticId,
      ),
      ...source.staticEntry.outputs.map(
        (entry) => (entry as ExternalNodeFixedOutputSnapshot).valueSemanticId,
      ),
    ].every((key) => valueMap.has(key));
    if (!allMapped) continue;
    preliminary.push({
      source,
      target,
      descriptor: createDescriptor(
        source as ParsedSourceRow & { staticEntry: ExternalStaticNodeCatalogEntry },
        target,
        valueMap,
      ),
    });
  }

  const targetCounts = new Map<string, number>();
  for (const candidate of preliminary) {
    const key = nodeTypeRefKey(candidate.target);
    targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
  }
  const acceptedCandidates: DescriptorCandidate[] = [];
  for (const candidate of preliminary) {
    const refKey = nodeTypeRefKey(candidate.target);
    if ((targetCounts.get(refKey) ?? 0) > 1) {
      candidate.source.issues.push(
        sourceIssue(
          'duplicate-projected-node-ref',
          candidate.source,
          `snapshot.entries[${candidate.source.index}].sourceTypeKey`,
        ),
      );
      continue;
    }
    const descriptorIssues = validateNodeTypeDescriptor(candidate.descriptor);
    if (descriptorIssues.length > 0) {
      candidate.source.issues.push(
        ...descriptorIssues.map((nested) => descriptorIssue(candidate.source, nested)),
      );
      continue;
    }
    acceptedCandidates.push(candidate);
  }

  const sourceIssues = sources.flatMap((source) => sortSourceIssues(source.issues));
  const issues = Object.freeze([...mappingIssues, ...sourceIssues]);
  const accepted = Object.freeze(
    acceptedCandidates.map((candidate): ExternalNodeCatalogProjectionAcceptance =>
      Object.freeze({
        sourceIndex: candidate.source.index,
        sourceTypeKey: candidate.source.key!,
        target: candidate.target,
      }),
    ),
  );
  if (acceptedCandidates.length === 0 && issues.length > 0) {
    return Object.freeze({
      status: 'rejected',
      accepted: EMPTY_ACCEPTED,
      issues,
    }) as ExternalNodeCatalogProjectionResult;
  }
  const contribution = freezeContribution(
    contributorId,
    acceptedCandidates.map((candidate) => candidate.descriptor),
  );
  if (issues.length === 0) {
    return Object.freeze({ status: 'complete', contribution, accepted, issues: EMPTY_ISSUES });
  }
  return Object.freeze({
    status: 'partial',
    contribution,
    accepted,
    issues,
  }) as ExternalNodeCatalogProjectionResult;
}

export function projectExternalNodeCatalogContribution(
  snapshot: unknown,
  mapping: unknown,
): ExternalNodeCatalogProjectionResult {
  let snapshotEnvelope: Envelope | null;
  let entrySlots: readonly RowSlot[] | null;
  try {
    snapshotEnvelope = inspectEnvelope(snapshot, ['schemaVersion', 'entries']);
    entrySlots =
      snapshotEnvelope === null
        ? null
        : inspectRowArray(snapshotEnvelope.values.entries, 'snapshot.entries');
  } catch {
    return invalidResult('invalid-foreign-snapshot', 'snapshot');
  }
  if (snapshotEnvelope === null || entrySlots === null) {
    return invalidResult('invalid-foreign-snapshot', 'snapshot');
  }
  if (snapshotEnvelope.values.schemaVersion !== EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION) {
    return unsupportedVersionResult('snapshot.schemaVersion');
  }

  let mappingEnvelope: Envelope | null;
  let identitySlots: readonly RowSlot[] | null;
  let valueSlots: readonly RowSlot[] | null;
  try {
    mappingEnvelope = inspectEnvelope(mapping, [
      'schemaVersion',
      'contributorId',
      'identities',
      'values',
    ]);
    identitySlots =
      mappingEnvelope === null
        ? null
        : inspectRowArray(mappingEnvelope.values.identities, 'mapping.identities');
    valueSlots =
      mappingEnvelope === null
        ? null
        : inspectRowArray(mappingEnvelope.values.values, 'mapping.values');
  } catch {
    return invalidResult('invalid-projection-mapping', 'mapping');
  }
  if (
    mappingEnvelope === null ||
    identitySlots === null ||
    valueSlots === null ||
    !isCanonicalText(mappingEnvelope.values.contributorId)
  ) {
    return invalidResult('invalid-projection-mapping', 'mapping');
  }
  if (mappingEnvelope.values.schemaVersion !== EXTERNAL_NODE_CATALOG_PROJECTION_SCHEMA_VERSION) {
    return unsupportedVersionResult('mapping.schemaVersion');
  }

  const combinedMappings = identitySlots.length + valueSlots.length;
  if (
    entrySlots.length > EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxEntries ||
    combinedMappings > EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxMappings ||
    (mappingEnvelope.values.contributorId as string).length >
      EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxStringLength
  ) {
    return invalidResult('admission-limit-exceeded', '$');
  }
  const envelopeProperties = 2 + entrySlots.length + 4 + identitySlots.length + valueSlots.length;
  const propertyBudgetLimit =
    EXTERNAL_NODE_CATALOG_PROJECTION_LIMITS.maxPortableProperties - envelopeProperties;
  if (propertyBudgetLimit < 0) return invalidResult('admission-limit-exceeded', '$');

  return projectAdmittedRows(
    entrySlots,
    identitySlots,
    valueSlots,
    mappingEnvelope.values.contributorId as string,
    propertyBudgetLimit,
  );
}
