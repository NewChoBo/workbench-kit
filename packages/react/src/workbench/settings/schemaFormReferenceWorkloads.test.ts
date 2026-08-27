import { describe, expect, it, vi } from 'vitest';
import {
  buildSchemaFormReferenceFixture,
  runSchemaFormReferenceWorkload,
  runSchemaFormReferenceWorkloadWithHelpers,
  SCHEMA_FORM_REFERENCE_WORKLOADS,
  SchemaFormReferenceWorkloadError,
  type SchemaFormReferenceHelpers,
  type SchemaFormReferenceStructuralRecord,
  type SchemaFormReferenceWorkloadDefinition,
  type SchemaFormReferenceWorkloadId,
} from '../../../test-support/schema-form-reference-workloads.js';
import {
  getWorkbenchSchemaFormErrors,
  normalizeWorkbenchSchemaFormValues,
  type WorkbenchSchemaFormErrors,
  type WorkbenchSchemaFormField,
  type WorkbenchSchemaFormFieldValue,
  type WorkbenchSchemaFormValues,
} from './SchemaForm.js';

const invalidSentinel = '__schema-form-reference-invalid__';
const exactError = 'SchemaForm reference value is invalid.';
const smallWorkloadId = 'schema-form.validation.small';
const realHelpers = {
  normalize: normalizeWorkbenchSchemaFormValues,
  getErrors: getWorkbenchSchemaFormErrors,
} satisfies SchemaFormReferenceHelpers;

function expectDeepFrozen(value: unknown, seen = new Set<object>()): void {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return;
  }
  const object = value as object;
  if (seen.has(object)) {
    return;
  }
  seen.add(object);
  expect(Object.isFrozen(object)).toBe(true);
  for (const key of Reflect.ownKeys(object)) {
    expectDeepFrozen(Reflect.get(object, key), seen);
  }
}

function expectedFieldIds(definition: SchemaFormReferenceWorkloadDefinition): string[] {
  return Array.from({ length: definition.fieldCount }, (_, index) => `field.${index}`);
}

function expectedRawValue(index: number): WorkbenchSchemaFormFieldValue {
  switch (index % 4) {
    case 0:
      return false;
    case 1:
      return `${index}`;
    case 2:
      return `option.${index}.a`;
    default:
      return `value.${index}`;
  }
}

function expectedNormalizedValue(index: number): WorkbenchSchemaFormFieldValue {
  return index % 4 === 1 ? index : expectedRawValue(index);
}

function expectExactEnumerableKeys(value: object, expectedKeys: readonly string[]): void {
  expect(Reflect.ownKeys(value)).toEqual(expectedKeys);
  for (const key of expectedKeys) {
    expect(Object.getOwnPropertyDescriptor(value, key)?.enumerable).toBe(true);
  }
}

function expectExactField(field: WorkbenchSchemaFormField, index: number): void {
  const commonKeys = ['defaultValue', 'id', 'label', 'type', 'validate'];
  expect(field.id).toBe(`field.${index}`);
  expect(field.label).toBe(`Field ${index}`);
  expect(field.validate).toEqual(expect.any(Function));

  switch (index % 4) {
    case 0:
      expect(field).toMatchObject({ defaultValue: false, type: 'checkbox' });
      expect(Reflect.ownKeys(field).sort()).toEqual(commonKeys);
      break;
    case 1:
      expect(field).toMatchObject({ defaultValue: index, min: 0, step: 1, type: 'number' });
      expect(Reflect.ownKeys(field).sort()).toEqual([...commonKeys, 'min', 'step'].sort());
      break;
    case 2:
      expect(field.type).toBe('select');
      if (field.type !== 'select') throw new TypeError('Expected an exact select field.');
      expect(field).toMatchObject({
        defaultValue: `option.${index}.a`,
        type: 'select',
        options: [
          { label: `Option A ${index}`, value: `option.${index}.a` },
          { label: `Option B ${index}`, value: `option.${index}.b` },
        ],
      });
      expect(Reflect.ownKeys(field).sort()).toEqual([...commonKeys, 'options'].sort());
      expect(Reflect.ownKeys(field.options[0] ?? {}).sort()).toEqual(['label', 'value']);
      expect(Reflect.ownKeys(field.options[1] ?? {}).sort()).toEqual(['label', 'value']);
      break;
    default:
      expect(field).toMatchObject({ defaultValue: `value.${index}`, type: 'text' });
      expect(Reflect.ownKeys(field).sort()).toEqual(commonKeys);
      break;
  }

  expect(field).not.toHaveProperty('required');
  expect(field).not.toHaveProperty('validationMessage');
}

function expectedRecord(
  definition: SchemaFormReferenceWorkloadDefinition,
): SchemaFormReferenceStructuralRecord {
  const changedFieldId = `field.${definition.fieldCount - 1}`;
  return {
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
    operation: { type: 'set-invalid-sentinel', changedFieldId },
    result: {
      validationCalls: definition.fieldCount,
      normalizedKeyCount: definition.fieldCount,
      errorCount: 1,
      errorFieldId: changedFieldId,
    },
  };
}

function captureStructuralMismatch(run: () => unknown): SchemaFormReferenceWorkloadError {
  let failure: unknown;
  try {
    run();
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(SchemaFormReferenceWorkloadError);
  expect(failure).toMatchObject({ code: 'structural-mismatch' });
  return failure as SchemaFormReferenceWorkloadError;
}

function replaceFirstValidator(
  fields: readonly WorkbenchSchemaFormField[],
  replace: (
    original: NonNullable<WorkbenchSchemaFormField['validate']>,
  ) => NonNullable<WorkbenchSchemaFormField['validate']> | undefined,
): readonly WorkbenchSchemaFormField[] {
  return fields.map((field, index) => {
    if (index !== 0 || !field.validate) return field;
    const validate = replace(field.validate);
    if (!validate) {
      const { validate: _validate, ...withoutValidate } = field;
      return withoutValidate as WorkbenchSchemaFormField;
    }
    return { ...field, validate } as WorkbenchSchemaFormField;
  });
}

describe('SchemaForm reference workloads', () => {
  it('owns the exact immutable SMALL/TYPICAL/STRESS manifest', () => {
    expect(SCHEMA_FORM_REFERENCE_WORKLOADS).toEqual([
      {
        id: 'schema-form.validation.small',
        tier: 'SMALL',
        fieldCount: 8,
        checkboxFieldCount: 2,
        numberFieldCount: 2,
        selectFieldCount: 2,
        textFieldCount: 2,
        operationCount: 1,
      },
      {
        id: 'schema-form.validation.typical',
        tier: 'TYPICAL',
        fieldCount: 100,
        checkboxFieldCount: 25,
        numberFieldCount: 25,
        selectFieldCount: 25,
        textFieldCount: 25,
        operationCount: 1,
      },
      {
        id: 'schema-form.validation.stress',
        tier: 'STRESS',
        fieldCount: 600,
        checkboxFieldCount: 150,
        numberFieldCount: 150,
        selectFieldCount: 150,
        textFieldCount: 150,
        operationCount: 1,
      },
    ]);
    expectDeepFrozen(SCHEMA_FORM_REFERENCE_WORKLOADS);
  });

  it.each(SCHEMA_FORM_REFERENCE_WORKLOADS)(
    'builds the exact deeply frozen $id fixture formulas',
    (definition) => {
      const fixture = buildSchemaFormReferenceFixture(definition.id);
      const fieldIds = expectedFieldIds(definition);

      expect(fixture.definition).toBe(definition);
      expect(fixture.fields).toHaveLength(definition.fieldCount);
      expectExactEnumerableKeys(fixture.beforeValues, fieldIds);
      for (let index = 0; index < definition.fieldCount; index += 1) {
        const field = fixture.fields[index];
        expect(field).toBeDefined();
        expectExactField(field!, index);
        expect(fixture.beforeValues[`field.${index}`]).toBe(expectedRawValue(index));
      }

      const normalized = normalizeWorkbenchSchemaFormValues(fixture.fields, fixture.beforeValues);
      expectExactEnumerableKeys(normalized, fieldIds);
      for (let index = 0; index < definition.fieldCount; index += 1) {
        expect(normalized[`field.${index}`]).toBe(expectedNormalizedValue(index));
      }
      expect(fixture.operation).toEqual({
        type: 'set-invalid-sentinel',
        changedFieldId: `field.${definition.fieldCount - 1}`,
        value: invalidSentinel,
      });
      expectDeepFrozen(fixture);
    },
  );

  it('builds fresh fixtures with fresh validators and nested select options', () => {
    const first = buildSchemaFormReferenceFixture(smallWorkloadId);
    const second = buildSchemaFormReferenceFixture(smallWorkloadId);

    expect(first).not.toBe(second);
    expect(first.definition).toBe(second.definition);
    expect(first.fields).not.toBe(second.fields);
    expect(first.beforeValues).not.toBe(second.beforeValues);
    expect(first.operation).not.toBe(second.operation);
    for (let index = 0; index < first.fields.length; index += 1) {
      const firstField = first.fields[index];
      const secondField = second.fields[index];
      expect(firstField).not.toBe(secondField);
      expect(firstField?.validate).not.toBe(secondField?.validate);
      if (firstField?.type === 'select' && secondField?.type === 'select') {
        expect(firstField.options).not.toBe(secondField.options);
        expect(firstField.options[0]).not.toBe(secondField.options[0]);
      }
    }
    expectDeepFrozen(first);
    expectDeepFrozen(second);
    expect(() => {
      (first.beforeValues as WorkbenchSchemaFormValues)['field.0'] = true;
    }).toThrow(TypeError);
  });

  it.each(SCHEMA_FORM_REFERENCE_WORKLOADS)(
    'runs $id through the real helpers and returns the exact frozen record',
    (definition) => {
      const record = runSchemaFormReferenceWorkload(definition.id);

      expect(record).toEqual(expectedRecord(definition));
      expectDeepFrozen(record);
    },
  );

  it('rejects an unknown workload before calling injected helpers', () => {
    const normalize = vi.fn<SchemaFormReferenceHelpers['normalize']>();
    const getErrors = vi.fn<SchemaFormReferenceHelpers['getErrors']>();
    let failure: unknown;

    try {
      runSchemaFormReferenceWorkloadWithHelpers(
        'schema-form.validation.unknown' as SchemaFormReferenceWorkloadId,
        { normalize, getErrors },
      );
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(SchemaFormReferenceWorkloadError);
    expect(failure).toMatchObject({ code: 'unknown-workload' });
    expect(normalize).not.toHaveBeenCalled();
    expect(getErrors).not.toHaveBeenCalled();
  });

  it.each(['normalize', 'getErrors'] as const)(
    'maps an unexpected $s helper throw to structural-mismatch',
    (helperName) => {
      const helperFailure = new Error(`injected ${helperName} failure`);
      const helpers: SchemaFormReferenceHelpers = {
        normalize:
          helperName === 'normalize'
            ? () => {
                throw helperFailure;
              }
            : realHelpers.normalize,
        getErrors:
          helperName === 'getErrors'
            ? () => {
                throw helperFailure;
              }
            : realHelpers.getErrors,
      };

      captureStructuralMismatch(() =>
        runSchemaFormReferenceWorkloadWithHelpers(smallWorkloadId, helpers),
      );
    },
  );

  it.each([
    {
      name: 'missing key',
      corrupt: (values: WorkbenchSchemaFormValues) => {
        const { ['field.0']: _missing, ...rest } = values;
        return rest;
      },
    },
    {
      name: 'extra key',
      corrupt: (values: WorkbenchSchemaFormValues) => ({ ...values, 'field.extra': 'extra' }),
    },
    {
      name: 'reordered keys',
      corrupt: (values: WorkbenchSchemaFormValues) =>
        Object.fromEntries(Object.entries(values).reverse()) as WorkbenchSchemaFormValues,
    },
    {
      name: 'symbol key',
      corrupt: (values: WorkbenchSchemaFormValues) => {
        const corrupted = { ...values };
        Reflect.set(corrupted, Symbol('extra'), 'extra');
        return corrupted;
      },
    },
    {
      name: 'non-enumerable key',
      corrupt: (values: WorkbenchSchemaFormValues) => {
        const corrupted = { ...values };
        Object.defineProperty(corrupted, 'field.0', {
          configurable: true,
          enumerable: false,
          value: corrupted['field.0'],
          writable: true,
        });
        return corrupted;
      },
    },
  ])('rejects normalized values with $name', ({ corrupt }) => {
    captureStructuralMismatch(() =>
      runSchemaFormReferenceWorkloadWithHelpers(smallWorkloadId, {
        normalize: (fields, values) => corrupt(realHelpers.normalize(fields, values)),
        getErrors: realHelpers.getErrors,
      }),
    );
  });

  it('does not read an exact descriptor-backed normalized Proxy after snapshotting it', () => {
    let getTrapCalls = 0;

    captureStructuralMismatch(() =>
      runSchemaFormReferenceWorkloadWithHelpers(smallWorkloadId, {
        normalize: (fields, values) => {
          const normalized = realHelpers.normalize(fields, values);
          return new Proxy(normalized, {
            get(target, key, receiver) {
              getTrapCalls += 1;
              return Reflect.get(target, key, receiver);
            },
          });
        },
        getErrors: () => ({}),
      }),
    );

    expect(getTrapCalls).toBe(0);
  });

  it('does not read malformed callback values through a Proxy get trap', () => {
    let getTrapCalls = 0;

    captureStructuralMismatch(() =>
      runSchemaFormReferenceWorkloadWithHelpers(smallWorkloadId, {
        normalize: realHelpers.normalize,
        getErrors: (fields, values) => {
          if (!values) throw new TypeError('Expected callback values.');
          const completeValues = values as WorkbenchSchemaFormValues;
          const malformedValues = { ...completeValues };
          Reflect.set(malformedValues, Symbol('extra'), 'extra');
          const proxiedValues = new Proxy(malformedValues, {
            get(target, key, receiver) {
              getTrapCalls += 1;
              return Reflect.get(target, key, receiver);
            },
          });
          const field = fields[0];
          const value = completeValues['field.0'];
          if (!field?.validate || value === undefined) {
            throw new TypeError('Expected the first validator value.');
          }
          field.validate(value, proxiedValues, field);
          return {};
        },
      }),
    );

    expect(getTrapCalls).toBe(0);
  });

  it('does not invoke an accessor-backed callback field id', () => {
    let idGetterCalls = 0;

    captureStructuralMismatch(() =>
      runSchemaFormReferenceWorkloadWithHelpers(smallWorkloadId, {
        normalize: realHelpers.normalize,
        getErrors: (fields, values) => {
          if (!values) throw new TypeError('Expected callback values.');
          const completeValues = values as WorkbenchSchemaFormValues;
          const field = fields[0];
          if (!field?.validate) throw new TypeError('Expected the first validator.');
          const accessorField = { ...field };
          Object.defineProperty(accessorField, 'id', {
            configurable: true,
            enumerable: true,
            get() {
              idGetterCalls += 1;
              return field.id;
            },
          });
          const value = completeValues['field.0'];
          if (value === undefined) throw new TypeError('Expected the first field value.');
          field.validate(value, completeValues, accessorField);
          return {};
        },
      }),
    );

    expect(idGetterCalls).toBe(0);
  });

  it.each([
    {
      name: 'missing callback',
      replace: () => undefined,
    },
    {
      name: 'duplicate callback',
      replace:
        (original: NonNullable<WorkbenchSchemaFormField['validate']>) =>
        (
          value: WorkbenchSchemaFormFieldValue,
          values: WorkbenchSchemaFormValues,
          field: WorkbenchSchemaFormField,
        ) => {
          original(value, values, field);
          return original(value, values, field);
        },
    },
    {
      name: 'unknown callback field id',
      replace:
        (original: NonNullable<WorkbenchSchemaFormField['validate']>) =>
        (
          value: WorkbenchSchemaFormFieldValue,
          values: WorkbenchSchemaFormValues,
          field: WorkbenchSchemaFormField,
        ) =>
          original(value, values, { ...field, id: 'field.unknown' }),
    },
    {
      name: 'callback value mismatch',
      replace:
        (original: NonNullable<WorkbenchSchemaFormField['validate']>) =>
        (
          _value: WorkbenchSchemaFormFieldValue,
          values: WorkbenchSchemaFormValues,
          field: WorkbenchSchemaFormField,
        ) =>
          original(true, values, field),
    },
    {
      name: 'callback values mismatch',
      replace:
        (original: NonNullable<WorkbenchSchemaFormField['validate']>) =>
        (
          value: WorkbenchSchemaFormFieldValue,
          values: WorkbenchSchemaFormValues,
          field: WorkbenchSchemaFormField,
        ) =>
          original(value, { ...values, 'field.1': 999 }, field),
    },
    {
      name: 'callback values symbol key',
      replace:
        (original: NonNullable<WorkbenchSchemaFormField['validate']>) =>
        (
          value: WorkbenchSchemaFormFieldValue,
          values: WorkbenchSchemaFormValues,
          field: WorkbenchSchemaFormField,
        ) => {
          const corrupted = { ...values };
          Reflect.set(corrupted, Symbol('extra'), 'extra');
          return original(value, corrupted, field);
        },
    },
    {
      name: 'callback values non-enumerable key',
      replace:
        (original: NonNullable<WorkbenchSchemaFormField['validate']>) =>
        (
          value: WorkbenchSchemaFormFieldValue,
          values: WorkbenchSchemaFormValues,
          field: WorkbenchSchemaFormField,
        ) => {
          const corrupted = { ...values };
          Object.defineProperty(corrupted, 'field.0', {
            configurable: true,
            enumerable: false,
            value: corrupted['field.0'],
            writable: true,
          });
          return original(value, corrupted, field);
        },
    },
  ])('rejects an error-helper $name', ({ replace }) => {
    captureStructuralMismatch(() =>
      runSchemaFormReferenceWorkloadWithHelpers(smallWorkloadId, {
        normalize: realHelpers.normalize,
        getErrors: (fields, values) =>
          realHelpers.getErrors(replaceFirstValidator(fields, replace), values),
      }),
    );
  });

  it.each([
    {
      name: 'missing error',
      corrupt: () => ({}),
    },
    {
      name: 'wrong error value',
      corrupt: (errors: WorkbenchSchemaFormErrors) => ({
        ...errors,
        'field.7': 'Wrong reference error.',
      }),
    },
    {
      name: 'extra error',
      corrupt: (errors: WorkbenchSchemaFormErrors) => ({
        ...errors,
        'field.extra': exactError,
      }),
    },
    {
      name: 'symbol error key',
      corrupt: (errors: WorkbenchSchemaFormErrors) => {
        const corrupted = { ...errors };
        Reflect.set(corrupted, Symbol('extra'), exactError);
        return corrupted;
      },
    },
    {
      name: 'non-enumerable error key',
      corrupt: (errors: WorkbenchSchemaFormErrors) => {
        const corrupted = { ...errors };
        Object.defineProperty(corrupted, 'field.7', {
          configurable: true,
          enumerable: false,
          value: exactError,
          writable: true,
        });
        return corrupted;
      },
    },
  ])('rejects an error helper with $name', ({ corrupt }) => {
    captureStructuralMismatch(() =>
      runSchemaFormReferenceWorkloadWithHelpers(smallWorkloadId, {
        normalize: realHelpers.normalize,
        getErrors: (fields, values) => corrupt(realHelpers.getErrors(fields, values)),
      }),
    );
  });

  it('keeps repeated and interleaved success runs isolated', () => {
    const first = runSchemaFormReferenceWorkload(smallWorkloadId);
    captureStructuralMismatch(() =>
      runSchemaFormReferenceWorkloadWithHelpers(smallWorkloadId, {
        normalize: realHelpers.normalize,
        getErrors: () => ({}),
      }),
    );
    const second = runSchemaFormReferenceWorkload(smallWorkloadId);
    const third = runSchemaFormReferenceWorkload(smallWorkloadId);

    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
    expectDeepFrozen(first);
    expectDeepFrozen(second);
    expectDeepFrozen(third);
  });
});
