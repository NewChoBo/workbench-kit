import { arePortsCompatible } from '../../registry/createValueTransformRegistry.js';
import { IDENTITY_TRANSFORM_ID, MAX_TRANSFORM_CHAIN } from '../constants.js';
import { isSafeObjectPath } from '../mapping/objectPathSafety.js';
import { MAX_MAPPING_FAN_IN, MAX_MAPPING_FAN_OUT } from '../mapping/mappingOperators.js';
import { sanitizeOptionSteps } from '../mapping/transformOptions.js';
import { flattenSourceFields, flattenTargetSlots } from '../mapping/treeUtils.js';
import type {
  FieldRemapDocument,
  MappingEdge,
  MappingOperator,
  SourceField,
  TargetSlot,
  ValueTransformDefinition,
  ValueTransformRegistry,
} from '../types.js';
import {
  FIELD_REMAP_DOCUMENT_VERSION,
  normalizeFieldRemapDocument,
  UnsupportedFieldRemapDocumentVersionError,
} from './fieldRemapDocument.js';

export const FIELD_REMAP_IMPORT_FAILURE_CODES = Object.freeze([
  'invalid-json',
  'unsupported-version',
  'invalid-document',
  'duplicate-id',
  'incompatible-source',
  'incompatible-target',
  'unavailable-transform',
] as const);

export type FieldRemapImportFailureCode = (typeof FIELD_REMAP_IMPORT_FAILURE_CODES)[number];

export interface FieldRemapImportContext {
  readonly sources: readonly SourceField[];
  readonly targets: readonly TargetSlot[];
  readonly transforms: ValueTransformRegistry;
}

export class FieldRemapImportAdmissionError extends Error {
  readonly code: Exclude<FieldRemapImportFailureCode, 'unsupported-version'>;
  readonly path: string;

  constructor(code: Exclude<FieldRemapImportFailureCode, 'unsupported-version'>, path: string) {
    super(`Field remap import failed with ${code} at ${path}.`);
    this.name = 'FieldRemapImportAdmissionError';
    this.code = code;
    this.path = path;
  }
}

type StrictRecord = Readonly<Record<string, unknown>>;

type EdgeLocation = {
  readonly edge: MappingEdge;
  readonly path: string;
};

type OperatorLocation = {
  readonly operator: MappingOperator;
  readonly path: string;
};

const UNSUPPORTED_RECORD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function fail(
  code: Exclude<FieldRemapImportFailureCode, 'unsupported-version'>,
  path: string,
): never {
  throw new FieldRemapImportAdmissionError(code, path);
}

type ReflectedOwnData = {
  readonly keys: readonly PropertyKey[];
  readonly descriptors: ReadonlyMap<PropertyKey, PropertyDescriptor>;
  readonly prototype: object | null;
};

function reflectOwnData(value: object, path: string): ReflectedOwnData {
  try {
    const keys = Reflect.ownKeys(value);
    const descriptors = new Map<PropertyKey, PropertyDescriptor>();
    for (const key of keys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (!descriptor) {
        return fail('invalid-document', path);
      }
      descriptors.set(key, descriptor);
    }
    return {
      keys,
      descriptors,
      prototype: Object.getPrototypeOf(value),
    };
  } catch {
    return fail('invalid-document', path);
  }
}

function strictPortableSnapshot(
  value: unknown,
  path: string,
  ancestors: Set<object> = new Set(),
  observed?: { readonly array: boolean; readonly reflected: ReflectedOwnData },
): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fail('invalid-document', path);
  }
  if (typeof value !== 'object') {
    return fail('invalid-document', path);
  }
  if (ancestors.has(value)) {
    return fail('invalid-document', path);
  }

  let array: boolean;
  let reflected: ReflectedOwnData;
  if (observed) {
    array = observed.array;
    reflected = observed.reflected;
  } else {
    try {
      array = Array.isArray(value);
    } catch {
      return fail('invalid-document', path);
    }
    reflected = reflectOwnData(value, path);
  }

  ancestors.add(value);

  if (array) {
    if (reflected.prototype !== Array.prototype) {
      ancestors.delete(value);
      return fail('invalid-document', path);
    }
    const lengthDescriptor = reflected.descriptors.get('length');
    if (
      !lengthDescriptor ||
      !('value' in lengthDescriptor) ||
      typeof lengthDescriptor.value !== 'number' ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0
    ) {
      ancestors.delete(value);
      return fail('invalid-document', path);
    }
    const length = lengthDescriptor.value;
    const indexKeys: string[] = [];
    for (const key of reflected.keys) {
      if (typeof key !== 'string') {
        ancestors.delete(value);
        return fail('invalid-document', path);
      }
      if (key === 'length') {
        continue;
      }
      const index = Number(key);
      const descriptor = reflected.descriptors.get(key);
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= length ||
        String(index) !== key ||
        !descriptor ||
        !descriptor.enumerable ||
        !('value' in descriptor)
      ) {
        ancestors.delete(value);
        return fail('invalid-document', path);
      }
      indexKeys.push(key);
    }
    if (indexKeys.length !== length) {
      ancestors.delete(value);
      return fail('invalid-document', path);
    }

    const clone: unknown[] = new Array(length);
    for (const key of indexKeys) {
      const descriptor = reflected.descriptors.get(key)!;
      clone[Number(key)] = strictPortableSnapshot(descriptor.value, `${path}[${key}]`, ancestors);
    }
    ancestors.delete(value);
    return Object.freeze(clone);
  }

  if (reflected.prototype !== Object.prototype && reflected.prototype !== null) {
    ancestors.delete(value);
    return fail('invalid-document', path);
  }
  const clone: Record<string, unknown> = {};
  for (const key of reflected.keys) {
    if (typeof key !== 'string' || UNSUPPORTED_RECORD_KEYS.has(key)) {
      ancestors.delete(value);
      return fail('invalid-document', path);
    }
    const descriptor = reflected.descriptors.get(key);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      ancestors.delete(value);
      return fail('invalid-document', path);
    }
    clone[key] = strictPortableSnapshot(descriptor.value, path, ancestors);
  }
  ancestors.delete(value);
  return Object.freeze(clone);
}

function strictTopLevelRecord(
  value: unknown,
  path: string,
): { readonly value: object; readonly reflected: ReflectedOwnData } {
  if (value === null || typeof value !== 'object') {
    return fail('invalid-document', path);
  }
  let array: boolean;
  try {
    array = Array.isArray(value);
  } catch {
    return fail('invalid-document', path);
  }
  if (array) {
    return fail('invalid-document', path);
  }
  const reflected = reflectOwnData(value, path);
  if (reflected.prototype !== Object.prototype && reflected.prototype !== null) {
    return fail('invalid-document', path);
  }
  return { value, reflected };
}

function isRecord(value: unknown): value is StrictRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(record: StrictRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function assertExactKeys(
  record: StrictRecord,
  required: readonly string[],
  optional: readonly string[],
  path: string,
): void {
  const allowed = new Set([...required, ...optional]);
  if (required.some((key) => !hasOwn(record, key))) {
    fail('invalid-document', path);
  }
  if (Object.keys(record).some((key) => !allowed.has(key))) {
    fail('invalid-document', path);
  }
}

function strictToken(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    return fail('invalid-document', path);
  }
  return value;
}

function strictTokenArray(
  value: unknown,
  path: string,
  options: { readonly min?: number; readonly max: number; readonly rejectIdentity?: boolean },
): readonly string[] {
  if (!Array.isArray(value) || value.length < (options.min ?? 0) || value.length > options.max) {
    return fail('invalid-document', path);
  }
  return Object.freeze(
    value.map((entry, index) => {
      const token = strictToken(entry, `${path}[${index}]`);
      if (options.rejectIdentity && token === IDENTITY_TRANSFORM_ID) {
        return fail('invalid-document', `${path}[${index}]`);
      }
      return token;
    }),
  );
}

function optionalTransformIds(record: StrictRecord, key: string, path: string): readonly string[] {
  if (!hasOwn(record, key)) {
    return [];
  }
  return strictTokenArray(record[key], `${path}.${key}`, {
    max: MAX_TRANSFORM_CHAIN,
    rejectIdentity: true,
  });
}

function optionalOptionSteps(
  record: StrictRecord,
  key: string,
  transformCount: number,
  path: string,
): readonly (Readonly<Record<string, unknown>> | undefined)[] | undefined {
  if (!hasOwn(record, key)) {
    return undefined;
  }
  const value = record[key];
  if (!Array.isArray(value) || value.length > transformCount) {
    return fail('invalid-document', `${path}.${key}`);
  }
  const steps = value.map((entry, index) => {
    if (entry === null) {
      return undefined;
    }
    if (!isRecord(entry)) {
      return fail('invalid-document', `${path}.${key}[${index}]`);
    }
    return entry;
  });
  return Object.freeze(steps);
}

function parseEdge(value: unknown, path: string, depth: 0 | 1): MappingEdge {
  if (!isRecord(value)) {
    return fail('invalid-document', path);
  }
  assertExactKeys(
    value,
    ['id', 'sourceFieldId', 'targetSlotId'],
    [
      'transformIds',
      'transformOptionSteps',
      'itemSourcePath',
      'itemTransformIds',
      'itemTransformOptionSteps',
      'itemEdges',
    ],
    path,
  );

  const id = strictToken(value.id, `${path}.id`);
  const sourceFieldId = strictToken(value.sourceFieldId, `${path}.sourceFieldId`);
  const targetSlotId = strictToken(value.targetSlotId, `${path}.targetSlotId`);
  const transformIds = optionalTransformIds(value, 'transformIds', path);
  const itemTransformIds = optionalTransformIds(value, 'itemTransformIds', path);
  const transformOptionSteps = optionalOptionSteps(
    value,
    'transformOptionSteps',
    transformIds.length,
    path,
  );
  const itemTransformOptionSteps = optionalOptionSteps(
    value,
    'itemTransformOptionSteps',
    itemTransformIds.length,
    path,
  );
  const itemSourcePath = hasOwn(value, 'itemSourcePath')
    ? strictToken(value.itemSourcePath, `${path}.itemSourcePath`)
    : undefined;
  if (itemSourcePath !== undefined && !isSafeObjectPath(itemSourcePath)) {
    return fail('invalid-document', `${path}.itemSourcePath`);
  }

  let itemEdges: readonly MappingEdge[] | undefined;
  if (hasOwn(value, 'itemEdges')) {
    if (depth !== 0 || !Array.isArray(value.itemEdges)) {
      return fail('invalid-document', `${path}.itemEdges`);
    }
    itemEdges = Object.freeze(
      value.itemEdges.map((edge, index) => parseEdge(edge, `${path}.itemEdges[${index}]`, 1)),
    );
    if (
      itemEdges.length > 0 &&
      (itemSourcePath !== undefined ||
        itemTransformIds.length > 0 ||
        itemTransformOptionSteps !== undefined)
    ) {
      return fail('invalid-document', `${path}.itemEdges`);
    }
  }

  return Object.freeze({
    id,
    sourceFieldId,
    targetSlotId,
    ...(transformIds.length > 0 ? { transformIds } : {}),
    ...(transformOptionSteps ? { transformOptionSteps } : {}),
    ...(itemSourcePath ? { itemSourcePath } : {}),
    ...(itemTransformIds.length > 0 ? { itemTransformIds } : {}),
    ...(itemTransformOptionSteps ? { itemTransformOptionSteps } : {}),
    ...(itemEdges ? { itemEdges } : {}),
  });
}

function parseOperator(value: unknown, path: string): MappingOperator {
  if (!isRecord(value)) {
    return fail('invalid-document', path);
  }
  const kind = value.kind;
  if (kind === 'combine') {
    assertExactKeys(value, ['kind', 'id', 'inputFieldIds', 'outputSlotId'], ['transformIds'], path);
    const transformIds = optionalTransformIds(value, 'transformIds', path);
    return Object.freeze({
      kind,
      id: strictToken(value.id, `${path}.id`),
      inputFieldIds: strictTokenArray(value.inputFieldIds, `${path}.inputFieldIds`, {
        min: 2,
        max: MAX_MAPPING_FAN_IN,
      }),
      outputSlotId: strictToken(value.outputSlotId, `${path}.outputSlotId`),
      ...(transformIds.length > 0 ? { transformIds } : {}),
    });
  }
  if (kind === 'split') {
    assertExactKeys(value, ['kind', 'id', 'inputFieldId', 'outputSlotIds'], ['transformIds'], path);
    const transformIds = optionalTransformIds(value, 'transformIds', path);
    return Object.freeze({
      kind,
      id: strictToken(value.id, `${path}.id`),
      inputFieldId: strictToken(value.inputFieldId, `${path}.inputFieldId`),
      outputSlotIds: strictTokenArray(value.outputSlotIds, `${path}.outputSlotIds`, {
        min: 2,
        max: MAX_MAPPING_FAN_OUT,
      }),
      ...(transformIds.length > 0 ? { transformIds } : {}),
    });
  }
  return fail('invalid-document', `${path}.kind`);
}

function parseStrictDocument(raw: unknown): FieldRemapDocument {
  const topLevel = strictTopLevelRecord(raw, '$');
  const versionDescriptor = topLevel.reflected.descriptors.get('version');
  if (!versionDescriptor || !('value' in versionDescriptor)) {
    return fail('invalid-document', '$.version');
  }
  const version = versionDescriptor.value;
  if (version !== FIELD_REMAP_DOCUMENT_VERSION) {
    if (
      version === null ||
      typeof version === 'string' ||
      typeof version === 'boolean' ||
      (typeof version === 'number' && Number.isFinite(version))
    ) {
      throw new UnsupportedFieldRemapDocumentVersionError(version);
    }
    return fail('invalid-document', '$.version');
  }
  const snapshot = strictPortableSnapshot(topLevel.value, '$', new Set(), {
    array: false,
    reflected: topLevel.reflected,
  });
  if (!isRecord(snapshot)) {
    return fail('invalid-document', '$');
  }
  assertExactKeys(snapshot, ['version', 'edges'], ['operators'], '$');
  if (!Array.isArray(snapshot.edges)) {
    return fail('invalid-document', '$.edges');
  }
  const edges = Object.freeze(
    snapshot.edges.map((edge, index) => parseEdge(edge, `$.edges[${index}]`, 0)),
  );
  let operators: readonly MappingOperator[] | undefined;
  if (hasOwn(snapshot, 'operators')) {
    if (!Array.isArray(snapshot.operators)) {
      return fail('invalid-document', '$.operators');
    }
    operators = Object.freeze(
      snapshot.operators.map((operator, index) => parseOperator(operator, `$.operators[${index}]`)),
    );
  }
  return Object.freeze({
    version: FIELD_REMAP_DOCUMENT_VERSION,
    edges,
    ...(operators ? { operators } : {}),
  });
}

function edgeLocations(document: FieldRemapDocument): readonly EdgeLocation[] {
  const locations: EdgeLocation[] = [];
  document.edges.forEach((edge, index) => {
    const path = `$.edges[${index}]`;
    locations.push({ edge, path });
    edge.itemEdges?.forEach((child, childIndex) => {
      locations.push({ edge: child, path: `${path}.itemEdges[${childIndex}]` });
    });
  });
  return locations;
}

function operatorLocations(document: FieldRemapDocument): readonly OperatorLocation[] {
  return (document.operators ?? []).map((operator, index) => ({
    operator,
    path: `$.operators[${index}]`,
  }));
}

function assertUniqueIds(values: readonly { readonly id: string }[], path: string): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value.id)) {
      fail('duplicate-id', `${path}[${index}].id`);
    }
    seen.add(value.id);
  });
}

function assertUniqueTokens(values: readonly string[], path: string): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      fail('duplicate-id', `${path}[${index}]`);
    }
    seen.add(value);
  });
}

function assertDocumentIds(document: FieldRemapDocument): void {
  const seenEdgeIds = new Set<string>();
  for (const { edge, path } of edgeLocations(document)) {
    if (seenEdgeIds.has(edge.id)) {
      fail('duplicate-id', `${path}.id`);
    }
    seenEdgeIds.add(edge.id);
  }
  assertUniqueIds(document.operators ?? [], '$.operators');
  document.operators?.forEach((operator, index) => {
    if (operator.kind === 'combine') {
      assertUniqueTokens(operator.inputFieldIds, `$.operators[${index}].inputFieldIds`);
    } else {
      assertUniqueTokens(operator.outputSlotIds, `$.operators[${index}].outputSlotIds`);
    }
  });
}

function indexSourceFields(sources: readonly SourceField[]): ReadonlyMap<string, SourceField> {
  return new Map(flattenSourceFields(sources).map((source) => [source.id, source]));
}

function indexTargetSlots(targets: readonly TargetSlot[]): ReadonlyMap<string, TargetSlot> {
  return new Map(flattenTargetSlots(targets).map((target) => [target.id, target]));
}

function assertReferences(
  edges: readonly EdgeLocation[],
  operators: readonly OperatorLocation[],
  sources: ReadonlyMap<string, SourceField>,
  targets: ReadonlyMap<string, TargetSlot>,
): void {
  for (const { edge, path } of edges) {
    if (!sources.has(edge.sourceFieldId)) {
      fail('incompatible-source', `${path}.sourceFieldId`);
    }
  }
  for (const { operator, path } of operators) {
    const sourceIds =
      operator.kind === 'combine' ? operator.inputFieldIds : [operator.inputFieldId];
    const missingIndex = sourceIds.findIndex((id) => !sources.has(id));
    if (missingIndex >= 0) {
      fail(
        'incompatible-source',
        operator.kind === 'combine'
          ? `${path}.inputFieldIds[${missingIndex}]`
          : `${path}.inputFieldId`,
      );
    }
  }
  for (const { edge, path } of edges) {
    if (!targets.has(edge.targetSlotId)) {
      fail('incompatible-target', `${path}.targetSlotId`);
    }
  }
  for (const { operator, path } of operators) {
    const targetIds =
      operator.kind === 'combine' ? [operator.outputSlotId] : operator.outputSlotIds;
    const missingIndex = targetIds.findIndex((id) => !targets.has(id));
    if (missingIndex >= 0) {
      fail(
        'incompatible-target',
        operator.kind === 'combine'
          ? `${path}.outputSlotId`
          : `${path}.outputSlotIds[${missingIndex}]`,
      );
    }
  }
}

function transformUses(
  edges: readonly EdgeLocation[],
  operators: readonly OperatorLocation[],
): readonly { readonly id: string; readonly path: string }[] {
  const uses: { id: string; path: string }[] = [];
  for (const { edge, path } of edges) {
    edge.transformIds?.forEach((id, index) =>
      uses.push({ id, path: `${path}.transformIds[${index}]` }),
    );
    edge.itemTransformIds?.forEach((id, index) =>
      uses.push({ id, path: `${path}.itemTransformIds[${index}]` }),
    );
  }
  for (const { operator, path } of operators) {
    operator.transformIds?.forEach((id, index) =>
      uses.push({ id, path: `${path}.transformIds[${index}]` }),
    );
  }
  return uses;
}

function snapshotTransformRegistry(
  registry: ValueTransformRegistry,
  uses: readonly { readonly id: string; readonly path: string }[],
): ValueTransformRegistry {
  const definitions = new Map<string, ValueTransformDefinition>();
  for (const use of uses) {
    if (definitions.has(use.id)) {
      continue;
    }
    let definition: ValueTransformDefinition | undefined;
    try {
      definition = registry.get(use.id);
    } catch {
      fail('unavailable-transform', use.path);
    }
    if (!definition) {
      fail('unavailable-transform', use.path);
    }
    definitions.set(use.id, definition);
  }
  return {
    list() {
      return [...definitions.values()];
    },
    get(id) {
      return definitions.get(id);
    },
    apply() {
      throw new Error('Import admission never executes transforms.');
    },
    register() {
      throw new Error('Import admission uses an immutable transform snapshot.');
    },
  };
}

function assertCompatibility(
  edges: readonly EdgeLocation[],
  operators: readonly OperatorLocation[],
  sources: ReadonlyMap<string, SourceField>,
  targets: ReadonlyMap<string, TargetSlot>,
  transforms: ValueTransformRegistry,
): void {
  for (const { edge, path } of edges) {
    const source = sources.get(edge.sourceFieldId)!;
    const target = targets.get(edge.targetSlotId)!;
    const activeChain = edge.itemEdges && edge.itemEdges.length > 0 ? [] : edge.transformIds;
    let compatible: boolean;
    try {
      compatible = arePortsCompatible({
        sourceType: source.dataType,
        targetType: target.dataType,
        transformIds: activeChain,
        registry: transforms,
      });
    } catch {
      return fail('unavailable-transform', `${path}.transformIds`);
    }
    if (!compatible) {
      fail('incompatible-target', `${path}.targetSlotId`);
    }
  }

  for (const { operator, path } of operators) {
    if (operator.kind === 'combine') {
      const target = targets.get(operator.outputSlotId)!;
      let compatible: boolean;
      try {
        compatible = arePortsCompatible({
          sourceType: 'object',
          targetType: target.dataType,
          transformIds: operator.transformIds,
          registry: transforms,
        });
      } catch {
        return fail('unavailable-transform', `${path}.transformIds`);
      }
      if (!compatible) {
        fail('incompatible-target', `${path}.outputSlotId`);
      }
      continue;
    }
    const source = sources.get(operator.inputFieldId)!;
    let compatible: boolean;
    try {
      compatible = arePortsCompatible({
        sourceType: source.dataType,
        targetType: 'object',
        transformIds: operator.transformIds,
        registry: transforms,
      });
    } catch {
      return fail('unavailable-transform', `${path}.transformIds`);
    }
    if (!compatible) {
      fail('incompatible-source', `${path}.inputFieldId`);
    }
  }
}

function cloneAndFreeze<T>(value: T, ancestors: Set<object> = new Set()): T {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value;
  }
  if (typeof value !== 'object' || ancestors.has(value)) {
    return fail('invalid-document', '$');
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    const clone = value.map((entry) => cloneAndFreeze(entry, ancestors));
    ancestors.delete(value);
    return Object.freeze(clone) as T;
  }
  const clone: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    clone[key] = cloneAndFreeze(entry, ancestors);
  }
  ancestors.delete(value);
  return Object.freeze(clone) as T;
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertNormalizedEdge(
  edge: MappingEdge,
  candidate: MappingEdge | undefined,
  path: string,
): void {
  const transformIds = edge.transformIds ?? [];
  const itemTransformIds = edge.itemTransformIds ?? [];
  const expectedTransformOptions = sanitizeOptionSteps(
    edge.transformOptionSteps,
    transformIds.length,
  );
  const expectedItemTransformOptions = sanitizeOptionSteps(
    edge.itemTransformOptionSteps,
    itemTransformIds.length,
  );
  if (
    !candidate ||
    candidate.id !== edge.id ||
    candidate.sourceFieldId !== edge.sourceFieldId ||
    candidate.targetSlotId !== edge.targetSlotId ||
    !sameJsonValue(candidate.transformIds ?? [], transformIds) ||
    !sameJsonValue(candidate.transformOptionSteps, expectedTransformOptions) ||
    candidate.itemSourcePath !== edge.itemSourcePath ||
    !sameJsonValue(candidate.itemTransformIds ?? [], itemTransformIds) ||
    !sameJsonValue(candidate.itemTransformOptionSteps, expectedItemTransformOptions)
  ) {
    fail('invalid-document', path);
  }
  const children = edge.itemEdges ?? [];
  const candidateChildren = candidate.itemEdges ?? [];
  if (children.length !== candidateChildren.length) {
    fail('invalid-document', `${path}.itemEdges`);
  }
  children.forEach((child, index) =>
    assertNormalizedEdge(child, candidateChildren[index], `${path}.itemEdges[${index}]`),
  );
}

function assertNormalizedMembership(
  admitted: FieldRemapDocument,
  normalized: FieldRemapDocument,
): void {
  if (admitted.edges.length !== normalized.edges.length) {
    fail('invalid-document', '$.edges');
  }
  admitted.edges.forEach((edge, index) => {
    const candidate = normalized.edges[index];
    assertNormalizedEdge(edge, candidate, `$.edges[${index}]`);
  });
  const admittedOperators = admitted.operators ?? [];
  const normalizedOperators = normalized.operators ?? [];
  if (admittedOperators.length !== normalizedOperators.length) {
    fail('invalid-document', '$.operators');
  }
  admittedOperators.forEach((operator, index) => {
    const candidate = normalizedOperators[index];
    if (!candidate || JSON.stringify(candidate) !== JSON.stringify(operator)) {
      fail('invalid-document', `$.operators[${index}]`);
    }
  });
}

/**
 * Strict raw-first admission for destructive Field Remap imports.
 * Existing permissive parse/deserialize helpers intentionally remain unchanged.
 */
export function preflightFieldRemapImport(
  raw: unknown,
  context: FieldRemapImportContext,
): FieldRemapDocument {
  const admitted = parseStrictDocument(raw);
  assertDocumentIds(admitted);
  const edges = edgeLocations(admitted);
  const operators = operatorLocations(admitted);
  const sources = indexSourceFields(context.sources);
  const targets = indexTargetSlots(context.targets);
  assertReferences(edges, operators, sources, targets);
  const transforms = snapshotTransformRegistry(context.transforms, transformUses(edges, operators));
  assertCompatibility(edges, operators, sources, targets, transforms);

  const normalized = normalizeFieldRemapDocument(admitted);
  assertNormalizedMembership(admitted, normalized);
  return cloneAndFreeze(normalized);
}

/** JSON.parse followed by the exact same strict raw-first admission path. */
export function deserializeFieldRemapImport(
  text: string,
  context: FieldRemapImportContext,
): FieldRemapDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return fail('invalid-json', '$');
  }
  return preflightFieldRemapImport(raw, context);
}
