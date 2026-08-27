import {
  createStrictPortableDataBudget,
  snapshotStrictPortableData,
  StrictPortableDataError,
} from '../internal/strict-portable-data';
import {
  collectNoncanonicalUiValueSchemaText,
  isSupportedUiValueSchemaShape,
} from '../internal/ui-value-schema-shape';
import {
  isUiBindingDirection,
  type UiComponentBindingDescriptor,
  type UiComponentRef,
} from '../ui-authoring/component-types';
import type { UiValueSchema } from '../ui-authoring/types';
import {
  UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION,
  UI_SOURCE_INPUT_LIMITS,
  type UiConvertibleSourceInputCandidate,
  type UiExactSourceInputCandidate,
  type UiIncompatibleSourceInputCandidate,
  type UiSourceBindingAssignment,
  type UiSourceInputAdmissionIssue,
  type UiSourceInputCandidate,
  type UiSourceInputCandidateSetResult,
  type UiSourceInputCompatibilityRequestV1,
  type UiSourceInputIncompatibleIssue,
  type UiSourceInputIssueBase,
  type UiSourceInputIssueCode,
  type UiSourceInputRequestSnapshotV1,
  type UiSourceInputResolution,
  type UiSourceInputTargetDescriptor,
  type UiSourceValueDescriptor,
  type UiValueCompatibilitySchemaSnapshot,
  type UiValueConversionEvidence,
} from './types';

type PlainRecord = Record<string, unknown>;

const INVALID_ARRAY_SLOT = Symbol('invalid-array-slot');

class AdmissionFailure extends Error {
  constructor(
    readonly kind: 'unsupported' | 'limit',
    readonly path: string,
  ) {
    super('Source-input compatibility admission failed.');
  }
}

interface PortablePreflightContext {
  readonly active: Set<object>;
  values: number;
}

function fail(kind: AdmissionFailure['kind'], path: string): never {
  throw new AdmissionFailure(kind, path);
}

function isCanonicalText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim();
}

function isPlainRecord(value: unknown): value is PlainRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownDataValue(record: PlainRecord, key: string): unknown | typeof INVALID_ARRAY_SLOT {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor !== undefined &&
    Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
    descriptor.enumerable === true
    ? descriptor.value
    : INVALID_ARRAY_SLOT;
}

function hasExactKeys(
  record: PlainRecord,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[],
): boolean {
  const keys = Reflect.ownKeys(record);
  if (keys.some((key) => typeof key !== 'string')) return false;
  const allowed = new Set(allowedKeys);
  if (keys.some((key) => !allowed.has(key as string))) return false;
  if (keys.some((key) => ownDataValue(record, key as string) === INVALID_ARRAY_SLOT)) return false;
  return requiredKeys.every((key) => ownDataValue(record, key) !== INVALID_ARRAY_SLOT);
}

function checkPortableValue(
  value: unknown,
  path: string,
  depth: number,
  context: PortablePreflightContext,
): void {
  context.values += 1;
  if (context.values > UI_SOURCE_INPUT_LIMITS.maxPortableValues) fail('limit', path);
  if (depth > UI_SOURCE_INPUT_LIMITS.maxPortableDepth) fail('limit', path);

  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') {
    if (value.length > UI_SOURCE_INPUT_LIMITS.maxStringCodeUnits) fail('limit', path);
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('unsupported', path);
    return;
  }
  if (typeof value !== 'object') fail('unsupported', path);
  if (context.active.has(value)) fail('unsupported', path);

  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (
    (array && prototype !== Array.prototype) ||
    (!array && prototype !== Object.prototype && prototype !== null)
  ) {
    fail('unsupported', path);
  }

  context.active.add(value);
  try {
    if (array) {
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
      if (
        lengthDescriptor === undefined ||
        !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value') ||
        typeof lengthDescriptor.value !== 'number' ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0
      ) {
        fail('unsupported', path);
      }
      const length = lengthDescriptor.value;
      if (length > UI_SOURCE_INPUT_LIMITS.maxArrayItems) fail('limit', path);
      const keys = Reflect.ownKeys(value);
      if (keys.length !== length + 1) fail('unsupported', path);
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor === undefined ||
          !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
          descriptor.enumerable !== true
        ) {
          fail('unsupported', `${path}[${key}]`);
        }
        checkPortableValue(descriptor.value, `${path}[${key}]`, depth + 1, context);
      }
      if (
        keys.some(
          (key) =>
            typeof key !== 'string' ||
            (key !== 'length' &&
              (!/^(0|[1-9]\d*)$/.test(key) ||
                Number(key) >= length ||
                String(Number(key)) !== key)),
        )
      ) {
        fail('unsupported', path);
      }
    } else {
      const keys = Reflect.ownKeys(value);
      if (keys.length > UI_SOURCE_INPUT_LIMITS.maxObjectKeys) fail('limit', path);
      for (const key of keys) {
        if (typeof key !== 'string') fail('unsupported', path);
        if (key.length > UI_SOURCE_INPUT_LIMITS.maxStringCodeUnits) fail('limit', path);
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor === undefined ||
          !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
          descriptor.enumerable !== true
        ) {
          fail('unsupported', path);
        }
        checkPortableValue(descriptor.value, `${path}.${key}`, depth + 1, context);
      }
    }
  } finally {
    context.active.delete(value);
  }
}

function readDenseArray(
  value: unknown,
  path: string,
): readonly (unknown | typeof INVALID_ARRAY_SLOT)[] {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      return fail('unsupported', path);
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
    if (
      lengthDescriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value') ||
      typeof lengthDescriptor.value !== 'number' ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0
    ) {
      return fail('unsupported', path);
    }
    const length = lengthDescriptor.value;
    if (length > UI_SOURCE_INPUT_LIMITS.maxArrayItems) return fail('limit', path);
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== length + 1 ||
      keys.some(
        (key) =>
          typeof key !== 'string' ||
          (key !== 'length' &&
            (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length || String(Number(key)) !== key)),
      )
    ) {
      return fail('unsupported', path);
    }
    const rows: (unknown | typeof INVALID_ARRAY_SLOT)[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      rows.push(
        descriptor !== undefined &&
          Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
          descriptor.enumerable === true
          ? descriptor.value
          : INVALID_ARRAY_SLOT,
      );
    }
    return rows;
  } catch (error) {
    if (error instanceof AdmissionFailure) throw error;
    return fail('unsupported', path);
  }
}

function canonicalizePortableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(canonicalizePortableValue));
  }
  if (isPlainRecord(value)) {
    const clone: PlainRecord = {};
    for (const key of Object.keys(value).sort()) {
      Object.defineProperty(clone, key, {
        configurable: false,
        enumerable: true,
        value: canonicalizePortableValue(value[key]),
        writable: false,
      });
    }
    return Object.freeze(clone);
  }
  return value;
}

function freezeDeep<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) freezeDeep(item);
  return Object.freeze(value);
}

function issue<TIssue extends UiSourceInputAdmissionIssue>(issue: TIssue): TIssue {
  return Object.freeze(issue);
}

function genericIssue<TCode extends UiSourceInputIssueCode>(
  code: TCode,
  path: string,
  message: string,
): UiSourceInputIssueBase<TCode> {
  return Object.freeze({ code, message, path }) as UiSourceInputIssueBase<TCode>;
}

function issueSortKey(value: { readonly [key: string]: unknown }): readonly string[] {
  return [
    String(value.path ?? ''),
    String(value.code ?? ''),
    String(value.sourceId ?? ''),
    String(value.nodeId ?? ''),
    String(value.inputId ?? ''),
    String(value.conversionId ?? ''),
  ];
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortIssues<T extends { readonly code: string; readonly path: string }>(
  issues: readonly T[],
): readonly T[] {
  return Object.freeze(
    [...issues].sort((left, right) => {
      const leftKey = issueSortKey(left);
      const rightKey = issueSortKey(right);
      for (let index = 0; index < leftKey.length; index += 1) {
        const compared = compareOrdinal(leftKey[index]!, rightKey[index]!);
        if (compared !== 0) return compared;
      }
      return 0;
    }),
  );
}

function clonePortableRow(
  value: unknown,
  path: string,
  budget: ReturnType<typeof createStrictPortableDataBudget>,
): unknown {
  return snapshotStrictPortableData(value, {
    budget,
    maxDepth: UI_SOURCE_INPUT_LIMITS.maxPortableDepth,
    maxStringLength: UI_SOURCE_INPUT_LIMITS.maxStringCodeUnits,
    path,
  });
}

function normalizedConstraints(
  schema: UiValueSchema | UiValueCompatibilitySchemaSnapshot,
): Readonly<Record<string, unknown>> | undefined {
  if (schema.constraints === undefined || Object.keys(schema.constraints).length === 0)
    return undefined;
  return canonicalizePortableValue(schema.constraints) as Readonly<Record<string, unknown>>;
}

function normalizeCompatibilitySchema(
  schema: UiValueSchema | UiValueCompatibilitySchemaSnapshot,
): UiValueCompatibilitySchemaSnapshot {
  const constraints = normalizedConstraints(schema);
  return Object.freeze({
    type: schema.type,
    ...(constraints === undefined ? {} : { constraints }),
  });
}

function parseUiValueSchema(value: unknown): UiValueSchema | null {
  if (!isSupportedUiValueSchemaShape(value)) return null;
  return collectNoncanonicalUiValueSchemaText(value).length === 0 ? value : null;
}

function parseCompatibilitySchema(value: unknown): UiValueCompatibilitySchemaSnapshot | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ['type', 'constraints'], ['type']) ||
    !isCanonicalText(value.type) ||
    (value.constraints !== undefined && !isPlainRecord(value.constraints))
  ) {
    return null;
  }
  return normalizeCompatibilitySchema(value as unknown as UiValueCompatibilitySchemaSnapshot);
}

function parseSource(value: unknown): UiSourceValueDescriptor | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ['id', 'value', 'semanticRole'], ['id', 'value']) ||
    !isCanonicalText(value.id) ||
    (value.semanticRole !== undefined && !isCanonicalText(value.semanticRole))
  ) {
    return null;
  }
  const schema = parseUiValueSchema(value.value);
  if (schema === null) return null;
  const normalized = normalizeCompatibilitySchema(schema);
  return Object.freeze({
    id: value.id,
    value: normalized,
    ...(value.semanticRole === undefined ? {} : { semanticRole: value.semanticRole }),
  });
}

function parseComponentRef(value: unknown): UiComponentRef | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ['id', 'version'], ['id', 'version']) ||
    !isCanonicalText(value.id) ||
    !isCanonicalText(value.version)
  ) {
    return null;
  }
  return Object.freeze({ id: value.id, version: value.version });
}

function parseTargetInput(value: unknown): UiComponentBindingDescriptor | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(
      value,
      ['id', 'label', 'description', 'semanticRole', 'direction', 'value'],
      ['id', 'direction', 'value'],
    ) ||
    !isCanonicalText(value.id) ||
    (value.label !== undefined && typeof value.label !== 'string') ||
    (value.description !== undefined && typeof value.description !== 'string') ||
    (value.semanticRole !== undefined && !isCanonicalText(value.semanticRole)) ||
    !isUiBindingDirection(value.direction)
  ) {
    return null;
  }
  const schema = parseUiValueSchema(value.value);
  if (schema === null) return null;
  const normalized = normalizeCompatibilitySchema(schema);
  const allowsBinding = schema.allowedSources?.includes('binding') === true;
  return Object.freeze({
    id: value.id,
    ...(value.semanticRole === undefined ? {} : { semanticRole: value.semanticRole }),
    direction: value.direction,
    value: Object.freeze({
      ...normalized,
      ...(allowsBinding ? { allowedSources: Object.freeze(['binding'] as const) } : {}),
    }),
  });
}

function parseTarget(value: unknown): UiSourceInputTargetDescriptor | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(
      value,
      ['nodeId', 'component', 'input', 'currentBindingId'],
      ['nodeId', 'component', 'input'],
    ) ||
    !isCanonicalText(value.nodeId) ||
    (value.currentBindingId !== undefined && !isCanonicalText(value.currentBindingId))
  ) {
    return null;
  }
  const component = parseComponentRef(value.component);
  const input = parseTargetInput(value.input);
  if (component === null || input === null) return null;
  return Object.freeze({
    nodeId: value.nodeId,
    component,
    input,
    ...(value.currentBindingId === undefined ? {} : { currentBindingId: value.currentBindingId }),
  });
}

function parseBinding(value: unknown): UiSourceBindingAssignment | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ['sourceId', 'bindingId'], ['sourceId', 'bindingId']) ||
    !isCanonicalText(value.sourceId) ||
    !isCanonicalText(value.bindingId)
  ) {
    return null;
  }
  return Object.freeze({ sourceId: value.sourceId, bindingId: value.bindingId });
}

function parseConversion(value: unknown): UiValueConversionEvidence | null {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ['id', 'source', 'target'], ['id', 'source', 'target']) ||
    !isCanonicalText(value.id)
  ) {
    return null;
  }
  const source = parseCompatibilitySchema(value.source);
  const target = parseCompatibilitySchema(value.target);
  if (source === null || target === null) return null;
  return Object.freeze({ id: value.id, source, target });
}

function duplicateValues<T>(values: readonly T[], key: (value: T) => string): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return new Set([...counts].filter(([, count]) => count > 1).map(([value]) => value));
}

function targetKey(target: UiSourceInputTargetDescriptor): string {
  return JSON.stringify([target.nodeId, target.input.id]);
}

function schemaKey(schema: UiValueCompatibilitySchemaSnapshot): string {
  return JSON.stringify(schema);
}

function blocks(issues: readonly UiSourceInputAdmissionIssue[]): UiSourceInputCandidateSetResult {
  const sorted = sortIssues(issues) as readonly [
    UiSourceInputAdmissionIssue,
    ...UiSourceInputAdmissionIssue[],
  ];
  return Object.freeze({ status: 'blocked', issues: sorted });
}

interface ReadRequestRows {
  readonly sources: readonly (unknown | typeof INVALID_ARRAY_SLOT)[];
  readonly targets: readonly (unknown | typeof INVALID_ARRAY_SLOT)[];
  readonly bindings: readonly (unknown | typeof INVALID_ARRAY_SLOT)[];
  readonly conversionEvidence: readonly (unknown | typeof INVALID_ARRAY_SLOT)[];
}

function readRequestRows(input: unknown): ReadRequestRows | UiSourceInputCandidateSetResult {
  try {
    if (!isPlainRecord(input)) {
      return blocks([
        genericIssue(
          'invalid-request',
          '$',
          'Source-input compatibility request must be plain data.',
        ),
      ]);
    }
    if (
      !hasExactKeys(
        input,
        ['schemaVersion', 'sources', 'targets', 'bindings', 'conversionEvidence'],
        ['schemaVersion', 'sources', 'targets', 'bindings'],
      )
    ) {
      return blocks([
        genericIssue(
          'invalid-request',
          '$',
          'Source-input compatibility request shape is invalid.',
        ),
      ]);
    }
    const schemaVersion = ownDataValue(input, 'schemaVersion');
    const sourceInput = ownDataValue(input, 'sources');
    const targetInput = ownDataValue(input, 'targets');
    const bindingInput = ownDataValue(input, 'bindings');
    const conversionInput = ownDataValue(input, 'conversionEvidence');
    if (schemaVersion !== UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION) {
      return blocks([
        genericIssue(
          'unsupported-version',
          '$.schemaVersion',
          'Source-input compatibility schema version is unsupported.',
        ),
      ]);
    }

    const sources = readDenseArray(sourceInput, '$.sources');
    const targets = readDenseArray(targetInput, '$.targets');
    const bindings = readDenseArray(bindingInput, '$.bindings');
    const conversionEvidence =
      conversionInput === INVALID_ARRAY_SLOT
        ? Object.freeze([])
        : readDenseArray(conversionInput, '$.conversionEvidence');

    if (
      sources.length > UI_SOURCE_INPUT_LIMITS.maxSources ||
      targets.length > UI_SOURCE_INPUT_LIMITS.maxTargetEndpoints ||
      bindings.length > UI_SOURCE_INPUT_LIMITS.maxSources ||
      conversionEvidence.length > UI_SOURCE_INPUT_LIMITS.maxConversionEvidence ||
      sources.length * targets.length > UI_SOURCE_INPUT_LIMITS.maxPairs
    ) {
      return blocks([
        genericIssue(
          'request-too-large',
          '$',
          'Source-input compatibility request exceeds limits.',
        ),
      ]);
    }
    if (sources.length === 0) {
      return blocks([
        genericIssue('invalid-request', '$.sources', 'At least one source value is required.'),
      ]);
    }
    return { bindings, conversionEvidence, sources, targets };
  } catch (error) {
    const code =
      error instanceof AdmissionFailure && error.kind === 'limit'
        ? 'request-too-large'
        : 'invalid-request';
    return blocks([
      genericIssue(
        code,
        '$',
        code === 'request-too-large'
          ? 'Source-input compatibility request exceeds limits.'
          : 'Source-input compatibility request must be supported own plain data.',
      ),
    ]);
  }
}

interface ParsedRequest {
  readonly sources: readonly UiSourceValueDescriptor[];
  readonly targets: readonly UiSourceInputTargetDescriptor[];
  readonly bindings: readonly UiSourceBindingAssignment[];
  readonly conversionEvidence: readonly UiValueConversionEvidence[];
}

function parseRows(rows: ReadRequestRows): ParsedRequest | UiSourceInputCandidateSetResult {
  const portableContext: PortablePreflightContext = {
    active: new Set<object>(),
    values: 5,
  };
  const categories = [
    ['sources', rows.sources, 'invalid-source'],
    ['targets', rows.targets, 'invalid-target'],
    ['bindings', rows.bindings, 'invalid-binding-assignment'],
    ['conversionEvidence', rows.conversionEvidence, 'invalid-conversion'],
  ] as const;
  const unsupported = new Map<string, Set<number>>();
  try {
    for (const [name, values] of categories) {
      const invalid = new Set<number>();
      unsupported.set(name, invalid);
      for (let index = 0; index < values.length; index += 1) {
        const value = values[index];
        if (value === INVALID_ARRAY_SLOT) {
          invalid.add(index);
          continue;
        }
        try {
          checkPortableValue(value, `$.${name}[${index}]`, 2, portableContext);
        } catch (error) {
          if (error instanceof AdmissionFailure && error.kind === 'limit') throw error;
          invalid.add(index);
        }
      }
    }
  } catch {
    return blocks([
      genericIssue('request-too-large', '$', 'Source-input compatibility request exceeds limits.'),
    ]);
  }

  const snapshotBudget = createStrictPortableDataBudget(UI_SOURCE_INPUT_LIMITS.maxPortableValues);
  const invalidIssues: UiSourceInputAdmissionIssue[] = [];
  let limited = false;

  function parseCategory<T>(
    name: keyof ReadRequestRows,
    values: readonly (unknown | typeof INVALID_ARRAY_SLOT)[],
    code: 'invalid-source' | 'invalid-target' | 'invalid-binding-assignment' | 'invalid-conversion',
    parser: (value: unknown) => T | null,
  ): T[] {
    const parsed: T[] = [];
    for (let index = 0; index < values.length; index += 1) {
      const path = `${name}[${index}]`;
      if (unsupported.get(name)?.has(index) === true) {
        invalidIssues.push(
          issue({
            code,
            message: 'Source-input operand is invalid.',
            path,
          } as UiSourceInputAdmissionIssue),
        );
        continue;
      }
      try {
        const cloned = clonePortableRow(values[index], `$.${path}`, snapshotBudget);
        const normalized = parser(cloned);
        if (normalized === null) {
          invalidIssues.push(
            issue({
              code,
              message: 'Source-input operand is invalid.',
              path,
            } as UiSourceInputAdmissionIssue),
          );
        } else {
          parsed.push(normalized);
        }
      } catch (error) {
        if (error instanceof StrictPortableDataError && error.kind === 'limit') {
          limited = true;
        } else {
          invalidIssues.push(
            issue({
              code,
              message: 'Source-input operand is invalid.',
              path,
            } as UiSourceInputAdmissionIssue),
          );
        }
      }
    }
    return parsed;
  }

  const sources = parseCategory('sources', rows.sources, 'invalid-source', parseSource);
  const targets = parseCategory('targets', rows.targets, 'invalid-target', parseTarget);
  const bindings = parseCategory(
    'bindings',
    rows.bindings,
    'invalid-binding-assignment',
    parseBinding,
  );
  const conversionEvidence = parseCategory(
    'conversionEvidence',
    rows.conversionEvidence,
    'invalid-conversion',
    parseConversion,
  );

  if (limited) {
    return blocks([
      genericIssue('request-too-large', '$', 'Source-input compatibility request exceeds limits.'),
    ]);
  }
  if (invalidIssues.length > 0) return blocks(invalidIssues);
  return { bindings, conversionEvidence, sources, targets };
}

function validateIdentityAndBindings(
  parsed: ParsedRequest,
): ParsedRequest | UiSourceInputCandidateSetResult {
  const issues: UiSourceInputAdmissionIssue[] = [];
  const duplicateSources = duplicateValues(parsed.sources, ({ id }) => id);
  parsed.sources.forEach((source, index) => {
    if (duplicateSources.has(source.id)) {
      issues.push(
        issue({
          code: 'duplicate-source',
          message: 'Source identity must be unique.',
          path: `sources[${index}].id`,
          sourceId: source.id,
        }),
      );
    }
  });

  const duplicateTargets = duplicateValues(parsed.targets, targetKey);
  parsed.targets.forEach((target, index) => {
    if (duplicateTargets.has(targetKey(target))) {
      issues.push(
        issue({
          code: 'duplicate-target',
          message: 'Target coordinate must be unique.',
          path: `targets[${index}]`,
          nodeId: target.nodeId,
          inputId: target.input.id,
        }),
      );
    }
  });

  const duplicateConversions = duplicateValues(parsed.conversionEvidence, ({ id }) => id);
  parsed.conversionEvidence.forEach((conversion, index) => {
    if (duplicateConversions.has(conversion.id)) {
      issues.push(
        issue({
          code: 'duplicate-conversion',
          message: 'Conversion evidence identity must be unique.',
          path: `conversionEvidence[${index}].id`,
          conversionId: conversion.id,
        }),
      );
    }
  });

  const sourceIds = new Set(parsed.sources.map(({ id }) => id));
  const bindingSourceDuplicates = duplicateValues(parsed.bindings, ({ sourceId }) => sourceId);
  const bindingIdDuplicates = duplicateValues(parsed.bindings, ({ bindingId }) => bindingId);
  parsed.bindings.forEach((binding, index) => {
    if (!sourceIds.has(binding.sourceId)) {
      issues.push(
        issue({
          code: 'extra-binding-assignment',
          message: 'Binding assignment must name an admitted source.',
          path: `bindings[${index}].sourceId`,
          sourceId: binding.sourceId,
        }),
      );
    } else if (bindingSourceDuplicates.has(binding.sourceId)) {
      issues.push(
        issue({
          code: 'invalid-binding-assignment',
          message: 'Each source must have exactly one binding assignment.',
          path: `bindings[${index}].sourceId`,
          sourceId: binding.sourceId,
        }),
      );
    }
    if (bindingIdDuplicates.has(binding.bindingId)) {
      issues.push(
        issue({
          code: 'duplicate-binding-id',
          message: 'Binding identity must be globally unique.',
          path: `bindings[${index}].bindingId`,
          sourceId: binding.sourceId,
        }),
      );
    }
  });
  const assignedSources = new Set(parsed.bindings.map(({ sourceId }) => sourceId));
  parsed.sources.forEach((source, index) => {
    if (!assignedSources.has(source.id)) {
      issues.push(
        issue({
          code: 'missing-binding-assignment',
          message: 'Every source requires one binding assignment.',
          path: `sources[${index}].id`,
          sourceId: source.id,
        }),
      );
    }
  });
  if (issues.length > 0) return blocks(issues);

  const bindingBySource = new Map(parsed.bindings.map((binding) => [binding.sourceId, binding]));
  return {
    ...parsed,
    bindings: Object.freeze(parsed.sources.map((source) => bindingBySource.get(source.id)!)),
    conversionEvidence: Object.freeze(
      [...parsed.conversionEvidence].sort((left, right) => compareOrdinal(left.id, right.id)),
    ),
  };
}

function incompatibleIssue(
  candidate: UiIncompatibleSourceInputCandidate,
  targetIndex: number,
): UiSourceInputIncompatibleIssue {
  return Object.freeze({
    code: candidate.compatibility.reason,
    message: 'Source and target are not compatible for an exact input binding.',
    path: `targets[${targetIndex}]`,
    sourceId: candidate.sourceId,
    nodeId: candidate.target.nodeId,
    inputId: candidate.target.input.id,
  });
}

function resolveCandidates(parsed: ParsedRequest): UiSourceInputCandidateSetResult {
  const bindingsBySource = new Map(parsed.bindings.map((binding) => [binding.sourceId, binding]));
  const targetIndexes = new Map(parsed.targets.map((target, index) => [target, index] as const));
  const schemaIdentities = new Map<string, number>();
  function schemaIdentity(schema: UiValueCompatibilitySchemaSnapshot): number {
    const key = schemaKey(schema);
    const existing = schemaIdentities.get(key);
    if (existing !== undefined) return existing;
    const identity = schemaIdentities.size;
    schemaIdentities.set(key, identity);
    return identity;
  }
  const sourceSchemas = new Map(
    parsed.sources.map((source) => {
      const schema = normalizeCompatibilitySchema(source.value);
      return [source.id, { identity: schemaIdentity(schema), schema }] as const;
    }),
  );
  const targetSchemas = new Map(
    parsed.targets.map((target) => {
      const schema = normalizeCompatibilitySchema(target.input.value);
      return [target, { identity: schemaIdentity(schema), schema }] as const;
    }),
  );
  const conversions = new Map<string, string[]>();
  for (const evidence of parsed.conversionEvidence) {
    const key = `${schemaIdentity(evidence.source)}:${schemaIdentity(evidence.target)}`;
    const ids = conversions.get(key) ?? [];
    ids.push(evidence.id);
    conversions.set(key, ids);
  }

  const candidates: UiSourceInputCandidate[] = [];
  const resolutions: UiSourceInputResolution[] = [];
  parsed.sources.forEach((source, sourceIndex) => {
    const assignedBinding = bindingsBySource.get(source.id)!;
    const sourceSchema = sourceSchemas.get(source.id)!;
    const sourceCandidates: UiSourceInputCandidate[] = [];
    parsed.targets.forEach((target) => {
      const semanticRoleMatched =
        source.semanticRole !== undefined && target.input.semanticRole === source.semanticRole;
      const base = { semanticRoleMatched, sourceId: source.id, target };
      let candidate: UiSourceInputCandidate;
      if (target.input.direction === 'output') {
        candidate = {
          ...base,
          compatibility: { kind: 'incompatible', reason: 'target-output-only' },
        };
      } else if (target.input.value.allowedSources?.includes('binding') !== true) {
        candidate = {
          ...base,
          compatibility: { kind: 'incompatible', reason: 'target-binding-disallowed' },
        };
      } else if (
        target.currentBindingId !== undefined &&
        target.currentBindingId !== assignedBinding.bindingId
      ) {
        candidate = {
          ...base,
          compatibility: { kind: 'incompatible', reason: 'target-occupied' },
        };
      } else {
        const targetSchema = targetSchemas.get(target)!;
        if (sourceSchema.identity === targetSchema.identity) {
          candidate = { ...base, compatibility: { kind: 'exact' } };
        } else {
          const conversionIds = conversions.get(
            `${sourceSchema.identity}:${targetSchema.identity}`,
          );
          if (conversionIds !== undefined && conversionIds.length > 0) {
            candidate = {
              ...base,
              compatibility: {
                kind: 'convertible',
                conversionIds: Object.freeze([...conversionIds]) as readonly [string, ...string[]],
              },
            };
          } else {
            candidate = {
              ...base,
              compatibility: {
                kind: 'incompatible',
                reason:
                  sourceSchema.schema.type === targetSchema.schema.type
                    ? 'constraint-mismatch'
                    : 'type-mismatch',
              },
            };
          }
        }
      }
      const frozen = freezeDeep(candidate);
      sourceCandidates.push(frozen);
      candidates.push(frozen);
    });

    const exact = sourceCandidates.filter(
      (candidate): candidate is UiExactSourceInputCandidate =>
        candidate.compatibility.kind === 'exact',
    );
    const preferred = exact.some(({ semanticRoleMatched }) => semanticRoleMatched)
      ? exact.filter(({ semanticRoleMatched }) => semanticRoleMatched)
      : exact;
    if (preferred.length === 1) {
      resolutions.push(
        Object.freeze({ sourceId: source.id, status: 'resolved', candidate: preferred[0]! }),
      );
      return;
    }
    if (preferred.length > 1) {
      resolutions.push(
        Object.freeze({
          sourceId: source.id,
          status: 'ambiguous',
          candidates: Object.freeze(preferred) as unknown as readonly [
            UiExactSourceInputCandidate,
            UiExactSourceInputCandidate,
            ...UiExactSourceInputCandidate[],
          ],
        }),
      );
      return;
    }
    const convertible = sourceCandidates.filter(
      (candidate): candidate is UiConvertibleSourceInputCandidate =>
        candidate.compatibility.kind === 'convertible',
    );
    if (convertible.length > 0) {
      resolutions.push(
        Object.freeze({
          sourceId: source.id,
          status: 'convertible',
          candidates: Object.freeze(convertible) as readonly [
            UiConvertibleSourceInputCandidate,
            ...UiConvertibleSourceInputCandidate[],
          ],
        }),
      );
      return;
    }
    const incompatible = sourceCandidates.filter(
      (candidate): candidate is UiIncompatibleSourceInputCandidate =>
        candidate.compatibility.kind === 'incompatible',
    );
    const incompatibleIssues: UiSourceInputIncompatibleIssue[] =
      incompatible.length === 0
        ? [
            Object.freeze({
              code: 'no-compatible-target',
              message: 'No compatible target is available for this source.',
              path: `sources[${sourceIndex}]`,
              sourceId: source.id,
            }) satisfies UiSourceInputIncompatibleIssue,
          ]
        : incompatible.map((candidate) =>
            incompatibleIssue(candidate, targetIndexes.get(candidate.target)!),
          );
    resolutions.push(
      Object.freeze({
        sourceId: source.id,
        status: 'incompatible',
        issues: sortIssues(incompatibleIssues) as readonly [
          UiSourceInputIncompatibleIssue,
          ...UiSourceInputIncompatibleIssue[],
        ],
      }),
    );
  });

  const snapshot = freezeDeep({
    schemaVersion: UI_SOURCE_INPUT_COMPATIBILITY_SCHEMA_VERSION,
    sources: Object.freeze(parsed.sources) as readonly [
      UiSourceValueDescriptor,
      ...UiSourceValueDescriptor[],
    ],
    targets: Object.freeze(parsed.targets),
    bindings: Object.freeze(parsed.bindings) as readonly [
      UiSourceBindingAssignment,
      ...UiSourceBindingAssignment[],
    ],
    conversionEvidence: Object.freeze(parsed.conversionEvidence),
  } satisfies UiSourceInputRequestSnapshotV1);
  return freezeDeep({
    status: 'ready',
    snapshot,
    candidates: Object.freeze(candidates),
    resolutions: Object.freeze(resolutions),
  });
}

export function resolveUiSourceInputCandidates(input: unknown): UiSourceInputCandidateSetResult {
  const rows = readRequestRows(input);
  if ('status' in rows) return rows;
  const parsed = parseRows(rows);
  if ('status' in parsed) return parsed;
  const validated = validateIdentityAndBindings(parsed);
  if ('status' in validated) return validated;
  return resolveCandidates(validated);
}

// Compile-time proof that normalized snapshots remain assignable to the frozen public request.
const _requestShape: UiSourceInputCompatibilityRequestV1 | undefined = undefined;
void _requestShape;
