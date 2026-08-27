import {
  getWorkbenchSchemaFormErrors,
  normalizeWorkbenchSchemaFormValues,
  type WorkbenchSchemaFormField,
  type WorkbenchSchemaFormFieldValue,
  type WorkbenchSchemaFormValues,
} from '../src/workbench/settings/SchemaForm.js';

export type SchemaFormReferenceWorkloadId =
  | 'schema-form.validation.small'
  | 'schema-form.validation.typical'
  | 'schema-form.validation.stress';

export type SchemaFormReferenceWorkloadTier = 'SMALL' | 'TYPICAL' | 'STRESS';

export interface SchemaFormReferenceWorkloadDefinition {
  readonly id: SchemaFormReferenceWorkloadId;
  readonly tier: SchemaFormReferenceWorkloadTier;
  readonly fieldCount: number;
  readonly checkboxFieldCount: number;
  readonly numberFieldCount: number;
  readonly selectFieldCount: number;
  readonly textFieldCount: number;
  readonly operationCount: 1;
}

export interface SchemaFormReferenceOperation {
  readonly type: 'set-invalid-sentinel';
  readonly changedFieldId: string;
  readonly value: '__schema-form-reference-invalid__';
}

export interface SchemaFormReferenceFixture {
  readonly definition: SchemaFormReferenceWorkloadDefinition;
  readonly fields: readonly WorkbenchSchemaFormField[];
  readonly beforeValues: Readonly<WorkbenchSchemaFormValues>;
  readonly operation: SchemaFormReferenceOperation;
}

export type SchemaFormReferenceWorkloadErrorCode = 'unknown-workload' | 'structural-mismatch';

export class SchemaFormReferenceWorkloadError extends Error {
  readonly code: SchemaFormReferenceWorkloadErrorCode;

  constructor(code: SchemaFormReferenceWorkloadErrorCode) {
    super(`SchemaForm reference workload failed: ${code}.`);
    this.name = 'SchemaFormReferenceWorkloadError';
    this.code = code;
  }
}

export interface SchemaFormReferenceHelpers {
  readonly normalize: typeof normalizeWorkbenchSchemaFormValues;
  readonly getErrors: typeof getWorkbenchSchemaFormErrors;
}

export interface SchemaFormReferenceStructuralRecord {
  readonly schemaVersion: 1;
  readonly fixtureRevision: 'schema-form-reference-v1';
  readonly workloadId: SchemaFormReferenceWorkloadId;
  readonly tier: SchemaFormReferenceWorkloadTier;
  readonly dimensions: {
    readonly fields: number;
    readonly checkboxFields: number;
    readonly numberFields: number;
    readonly selectFields: number;
    readonly textFields: number;
    readonly operations: 1;
  };
  readonly operation: {
    readonly type: 'set-invalid-sentinel';
    readonly changedFieldId: string;
  };
  readonly result: {
    readonly validationCalls: number;
    readonly normalizedKeyCount: number;
    readonly errorCount: 1;
    readonly errorFieldId: string;
  };
}

type SchemaFormFieldType = WorkbenchSchemaFormField['type'];

type ValidationObserver = (
  value: WorkbenchSchemaFormFieldValue,
  values: WorkbenchSchemaFormValues,
  field: WorkbenchSchemaFormField,
) => void;

interface FixtureBundle {
  readonly fixture: SchemaFormReferenceFixture;
  readonly expectedNormalizedBefore: Readonly<WorkbenchSchemaFormValues>;
}

interface OwnDataEntrySnapshot {
  readonly key: PropertyKey;
  readonly enumerable: boolean;
  readonly kind: 'accessor' | 'data';
  readonly value?: unknown;
}

interface OwnDataRecordSnapshot {
  readonly entries: readonly OwnDataEntrySnapshot[];
  readonly keys: readonly PropertyKey[];
}

interface ValidationObservation {
  readonly fieldId: unknown;
  readonly value: unknown;
  readonly valueMatchesFieldAtCall: boolean;
  readonly valuesAtCall: OwnDataRecordSnapshot;
}

const INVALID_SENTINEL = '__schema-form-reference-invalid__' as const;
const INVALID_ERROR_MESSAGE = 'SchemaForm reference value is invalid.' as const;
const FIELD_TYPES = ['checkbox', 'number', 'select', 'text'] as const;

const definitions = [
  defineWorkload('schema-form.validation.small', 'SMALL', 8),
  defineWorkload('schema-form.validation.typical', 'TYPICAL', 100),
  defineWorkload('schema-form.validation.stress', 'STRESS', 600),
] as const;

export const SCHEMA_FORM_REFERENCE_WORKLOADS: readonly SchemaFormReferenceWorkloadDefinition[] =
  deepFreeze([...definitions]);

const REAL_HELPERS: SchemaFormReferenceHelpers = Object.freeze({
  normalize: normalizeWorkbenchSchemaFormValues,
  getErrors: getWorkbenchSchemaFormErrors,
});

function defineWorkload(
  id: SchemaFormReferenceWorkloadId,
  tier: SchemaFormReferenceWorkloadTier,
  fieldCount: number,
): SchemaFormReferenceWorkloadDefinition {
  const fieldTypeCount = fieldCount / FIELD_TYPES.length;
  return deepFreeze({
    id,
    tier,
    fieldCount,
    checkboxFieldCount: fieldTypeCount,
    numberFieldCount: fieldTypeCount,
    selectFieldCount: fieldTypeCount,
    textFieldCount: fieldTypeCount,
    operationCount: 1,
  });
}

function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return value;
  }

  const object = value as object;
  if (seen.has(object)) {
    return value;
  }
  seen.add(object);

  for (const key of Reflect.ownKeys(object)) {
    const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
    if (!descriptor) continue;
    if ('value' in descriptor) {
      deepFreeze(descriptor.value, seen);
    } else {
      deepFreeze(descriptor.get, seen);
      deepFreeze(descriptor.set, seen);
    }
  }

  return Object.freeze(value);
}

function resolveDefinition(id: unknown): SchemaFormReferenceWorkloadDefinition {
  if (typeof id !== 'string') {
    throw new SchemaFormReferenceWorkloadError('unknown-workload');
  }

  const definition = SCHEMA_FORM_REFERENCE_WORKLOADS.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new SchemaFormReferenceWorkloadError('unknown-workload');
  }
  return definition;
}

function fieldTypeAt(index: number): SchemaFormFieldType {
  return FIELD_TYPES[index % FIELD_TYPES.length]!;
}

function fieldIdAt(index: number): string {
  return `field.${index}`;
}

function createField(
  index: number,
  lastIndex: number,
  observer: ValidationObserver,
): WorkbenchSchemaFormField {
  const id = fieldIdAt(index);
  const validate: NonNullable<WorkbenchSchemaFormField['validate']> = (value, values, field) => {
    observer(value, values, field);
    return index === lastIndex && value === INVALID_SENTINEL ? INVALID_ERROR_MESSAGE : undefined;
  };
  const common = {
    id,
    label: `Field ${index}`,
    validate,
  };

  switch (fieldTypeAt(index)) {
    case 'checkbox':
      return {
        ...common,
        defaultValue: false,
        type: 'checkbox',
      };
    case 'number':
      return {
        ...common,
        defaultValue: index,
        min: 0,
        step: 1,
        type: 'number',
      };
    case 'select':
      return {
        ...common,
        defaultValue: `option.${index}.a`,
        options: [
          { label: `Option A ${index}`, value: `option.${index}.a` },
          { label: `Option B ${index}`, value: `option.${index}.b` },
        ],
        type: 'select',
      };
    case 'text':
      return {
        ...common,
        defaultValue: `value.${index}`,
        type: 'text',
      };
  }
}

function beforeValueAt(index: number): WorkbenchSchemaFormFieldValue {
  switch (fieldTypeAt(index)) {
    case 'checkbox':
      return false;
    case 'number':
      return `${index}`;
    case 'select':
      return `option.${index}.a`;
    case 'text':
      return `value.${index}`;
  }
}

function normalizedValueAt(index: number): WorkbenchSchemaFormFieldValue {
  return fieldTypeAt(index) === 'number' ? index : beforeValueAt(index);
}

function createFixtureBundle(
  definition: SchemaFormReferenceWorkloadDefinition,
  observer: ValidationObserver,
): FixtureBundle {
  const fields: WorkbenchSchemaFormField[] = [];
  const beforeValues: WorkbenchSchemaFormValues = {};
  const expectedNormalizedBefore: WorkbenchSchemaFormValues = {};
  const lastIndex = definition.fieldCount - 1;

  for (let index = 0; index < definition.fieldCount; index += 1) {
    const id = fieldIdAt(index);
    fields.push(createField(index, lastIndex, observer));
    beforeValues[id] = beforeValueAt(index);
    expectedNormalizedBefore[id] = normalizedValueAt(index);
  }

  const fixture: SchemaFormReferenceFixture = {
    definition,
    fields,
    beforeValues,
    operation: {
      type: 'set-invalid-sentinel',
      changedFieldId: fieldIdAt(lastIndex),
      value: INVALID_SENTINEL,
    },
  };

  return {
    fixture: deepFreeze(fixture),
    expectedNormalizedBefore: deepFreeze(expectedNormalizedBefore),
  };
}

export function buildSchemaFormReferenceFixture(
  id: SchemaFormReferenceWorkloadId,
): SchemaFormReferenceFixture {
  const definition = resolveDefinition(id);
  return createFixtureBundle(definition, () => {}).fixture;
}

export function runSchemaFormReferenceWorkload(
  id: SchemaFormReferenceWorkloadId,
): SchemaFormReferenceStructuralRecord {
  const definition = resolveDefinition(id);
  return runWithHelpers(definition, REAL_HELPERS);
}

export function runSchemaFormReferenceWorkloadWithHelpers(
  id: SchemaFormReferenceWorkloadId,
  helpers: SchemaFormReferenceHelpers,
): SchemaFormReferenceStructuralRecord {
  const definition = resolveDefinition(id);
  return runWithHelpers(definition, helpers);
}

function runWithHelpers(
  definition: SchemaFormReferenceWorkloadDefinition,
  helpers: SchemaFormReferenceHelpers,
): SchemaFormReferenceStructuralRecord {
  try {
    const observations: ValidationObservation[] = [];
    const observer: ValidationObserver = (value, values, field) => {
      const fieldId = readOwnDataProperty(field, 'id');
      const valuesAtCall = captureOwnDataRecord(values);
      observations.push({
        fieldId,
        value,
        valueMatchesFieldAtCall:
          typeof fieldId === 'string' &&
          Object.is(value, readDataSnapshotValue(valuesAtCall, fieldId)),
        valuesAtCall,
      });
    };
    const { fixture, expectedNormalizedBefore } = createFixtureBundle(definition, observer);
    const fixtureBeforeRun = cloneMutationSnapshot(fixture);
    const expectedIds = fixture.fields.map((field) => field.id);

    requireStructure(isDeeplyFrozen(fixture));
    requireStructure(matchesExpectedFieldDistribution(fixture));

    const normalizedBefore = helpers.normalize(fixture.fields, fixture.beforeValues);
    const normalizedBeforeSnapshot = captureOwnDataRecord(normalizedBefore);
    requireStructure(
      matchesExpectedOwnData(normalizedBeforeSnapshot, expectedIds, expectedNormalizedBefore),
    );

    const expectedAfter: WorkbenchSchemaFormValues = {
      ...expectedNormalizedBefore,
      [fixture.operation.changedFieldId]: fixture.operation.value,
    };
    const afterValues = materializeOwnDataRecord(normalizedBeforeSnapshot);
    afterValues[fixture.operation.changedFieldId] = fixture.operation.value;
    requireStructure(
      matchesExpectedOwnData(captureOwnDataRecord(afterValues), expectedIds, expectedAfter),
    );
    requireStructure(
      differsAtOnlyKey(
        expectedNormalizedBefore,
        expectedAfter,
        expectedIds,
        fixture.operation.changedFieldId,
      ),
    );

    const errors = helpers.getErrors(fixture.fields, afterValues);
    requireStructure(observationsMatchExpected(observations, expectedIds, expectedAfter));
    requireStructure(
      matchesExpectedOwnData(captureOwnDataRecord(errors), [fixture.operation.changedFieldId], {
        [fixture.operation.changedFieldId]: INVALID_ERROR_MESSAGE,
      }),
    );
    requireStructure(exactlyMatches(fixture, fixtureBeforeRun));
    requireStructure(isDeeplyFrozen(fixture));

    return deepFreeze({
      schemaVersion: 1,
      fixtureRevision: 'schema-form-reference-v1',
      workloadId: definition.id,
      tier: definition.tier,
      dimensions: {
        fields: definition.fieldCount,
        checkboxFields: definition.checkboxFieldCount,
        numberFields: definition.numberFieldCount,
        selectFields: definition.selectFieldCount,
        textFields: definition.textFieldCount,
        operations: 1,
      },
      operation: {
        type: 'set-invalid-sentinel',
        changedFieldId: fixture.operation.changedFieldId,
      },
      result: {
        validationCalls: observations.length,
        normalizedKeyCount: normalizedBeforeSnapshot.keys.length,
        errorCount: 1,
        errorFieldId: fixture.operation.changedFieldId,
      },
    });
  } catch {
    throw new SchemaFormReferenceWorkloadError('structural-mismatch');
  }
}

function matchesExpectedFieldDistribution(fixture: SchemaFormReferenceFixture): boolean {
  const counts: Record<SchemaFormFieldType, number> = {
    checkbox: 0,
    number: 0,
    select: 0,
    text: 0,
  };

  for (let index = 0; index < fixture.fields.length; index += 1) {
    const field = fixture.fields[index];
    if (!field || field.id !== fieldIdAt(index) || field.type !== fieldTypeAt(index)) {
      return false;
    }
    counts[field.type] += 1;
  }

  return (
    fixture.fields.length === fixture.definition.fieldCount &&
    counts.checkbox === fixture.definition.checkboxFieldCount &&
    counts.number === fixture.definition.numberFieldCount &&
    counts.select === fixture.definition.selectFieldCount &&
    counts.text === fixture.definition.textFieldCount
  );
}

function captureOwnDataRecord(value: unknown): OwnDataRecordSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Expected a record.');
  }

  const keys = Reflect.ownKeys(value);
  const entries = keys.map((key): OwnDataEntrySnapshot => {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (!descriptor) {
      throw new TypeError('Expected a stable own property descriptor.');
    }
    if ('value' in descriptor) {
      return {
        key,
        enumerable: descriptor.enumerable ?? false,
        kind: 'data',
        value: descriptor.value,
      };
    }
    return {
      key,
      enumerable: descriptor.enumerable ?? false,
      kind: 'accessor',
    };
  });

  return {
    entries,
    keys,
  };
}

function readOwnDataProperty(value: object, key: PropertyKey): unknown {
  const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function readDataSnapshotValue(snapshot: OwnDataRecordSnapshot, key: string): unknown {
  const entry = snapshot.entries.find((candidate) => candidate.key === key);
  return entry?.kind === 'data' ? entry.value : undefined;
}

function materializeOwnDataRecord(snapshot: OwnDataRecordSnapshot): WorkbenchSchemaFormValues {
  const values: WorkbenchSchemaFormValues = {};
  for (const entry of snapshot.entries) {
    if (typeof entry.key !== 'string' || entry.kind !== 'data' || !entry.enumerable) {
      throw new TypeError('Expected enumerable string data properties.');
    }
    values[entry.key] = entry.value as WorkbenchSchemaFormFieldValue;
  }
  return values;
}

function matchesExpectedOwnData(
  snapshot: OwnDataRecordSnapshot,
  expectedKeys: readonly string[],
  expectedValues: Readonly<Record<string, unknown>>,
): boolean {
  if (
    snapshot.keys.length !== expectedKeys.length ||
    snapshot.entries.length !== expectedKeys.length
  ) {
    return false;
  }

  return expectedKeys.every((expectedKey, index) => {
    const key = snapshot.keys[index];
    const entry = snapshot.entries[index];
    return (
      key === expectedKey &&
      entry?.key === expectedKey &&
      entry.kind === 'data' &&
      entry.enumerable &&
      Object.is(entry.value, expectedValues[expectedKey])
    );
  });
}

function observationsMatchExpected(
  observations: readonly ValidationObservation[],
  expectedIds: readonly string[],
  expectedAfter: Readonly<WorkbenchSchemaFormValues>,
): boolean {
  if (observations.length !== expectedIds.length) {
    return false;
  }

  const counts = new Map(expectedIds.map((id) => [id, 0]));
  for (const observation of observations) {
    if (typeof observation.fieldId !== 'string' || !counts.has(observation.fieldId)) {
      return false;
    }
    counts.set(observation.fieldId, (counts.get(observation.fieldId) ?? 0) + 1);
    if (
      !observation.valueMatchesFieldAtCall ||
      !matchesExpectedOwnData(observation.valuesAtCall, expectedIds, expectedAfter) ||
      !Object.is(observation.value, expectedAfter[observation.fieldId])
    ) {
      return false;
    }
  }

  return expectedIds.every((id) => counts.get(id) === 1);
}

function differsAtOnlyKey(
  before: Readonly<WorkbenchSchemaFormValues>,
  after: Readonly<WorkbenchSchemaFormValues>,
  expectedIds: readonly string[],
  changedFieldId: string,
): boolean {
  let changedCount = 0;
  for (const id of expectedIds) {
    if (!Object.is(before[id], after[id])) {
      changedCount += 1;
      if (id !== changedFieldId) {
        return false;
      }
    }
  }
  return changedCount === 1;
}

function requireStructure(condition: boolean): asserts condition {
  if (!condition) {
    throw new SchemaFormReferenceWorkloadError('structural-mismatch');
  }
}

function cloneMutationSnapshot<T>(value: T, seen = new Map<object, unknown>()): T {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return value;
  }
  if (typeof value === 'function') {
    return value;
  }

  const object = value as object;
  const prior = seen.get(object);
  if (prior !== undefined) {
    return prior as T;
  }

  const clone: object = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value) as object | null);
  seen.set(object, clone);
  for (const key of Reflect.ownKeys(object)) {
    if (Array.isArray(value) && key === 'length') continue;
    const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
    if (!descriptor) continue;
    if ('value' in descriptor) {
      Reflect.defineProperty(clone, key, {
        configurable: true,
        enumerable: descriptor.enumerable,
        value: cloneMutationSnapshot(descriptor.value, seen),
        writable: true,
      });
    } else {
      Reflect.defineProperty(clone, key, {
        configurable: true,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set: descriptor.set,
      });
    }
  }
  return clone as T;
}

function exactlyMatches(
  actual: unknown,
  expected: unknown,
  seen = new Map<object, Set<object>>(),
): boolean {
  if (Object.is(actual, expected)) {
    return true;
  }
  if (
    actual === null ||
    expected === null ||
    typeof actual !== 'object' ||
    typeof expected !== 'object' ||
    Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected)
  ) {
    return false;
  }

  const priorExpected = seen.get(actual);
  if (priorExpected?.has(expected)) {
    return true;
  }
  if (priorExpected) {
    priorExpected.add(expected);
  } else {
    seen.set(actual, new Set([expected]));
  }

  const actualKeys = Reflect.ownKeys(actual);
  const expectedKeys = Reflect.ownKeys(expected);
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index]) &&
    actualKeys.every((key) =>
      exactlyMatches(Reflect.get(actual, key), Reflect.get(expected, key), seen),
    )
  );
}

function isDeeplyFrozen(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return true;
  }

  const object = value as object;
  if (seen.has(object)) {
    return true;
  }
  seen.add(object);
  if (!Object.isFrozen(object)) {
    return false;
  }

  return Reflect.ownKeys(object).every((key) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
    if (!descriptor) return false;
    return 'value' in descriptor
      ? isDeeplyFrozen(descriptor.value, seen)
      : isDeeplyFrozen(descriptor.get, seen) && isDeeplyFrozen(descriptor.set, seen);
  });
}
