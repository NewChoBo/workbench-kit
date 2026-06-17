import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  WorkbenchSchemaForm,
  coerceWorkbenchSchemaFormFieldValue,
  getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError,
  isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchSchemaFormValues,
  type WorkbenchSchemaFormField,
} from './SchemaForm';

const fields: WorkbenchSchemaFormField[] = [
  {
    defaultValue: 'Workbench',
    description: 'Display name for this configuration.',
    id: 'displayName',
    label: 'Display name',
    required: true,
    type: 'text',
  },
  {
    defaultValue: 'comfortable',
    id: 'density',
    label: 'Density',
    options: [
      { label: 'Comfortable', value: 'comfortable' },
      { label: 'Compact', value: 'compact' },
    ],
    type: 'select',
  },
  {
    defaultValue: true,
    id: 'confirmActions',
    label: 'Confirm before side effects',
    type: 'checkbox',
  },
  {
    defaultValue: 10,
    id: 'maxItems',
    label: 'Maximum items',
    min: 1,
    type: 'number',
    validate: (value) =>
      typeof value === 'number' && value < 1 ? 'Use a value greater than zero.' : undefined,
  },
];

describe('WorkbenchSchemaForm helpers', () => {
  it('normalizes defaults and coerces field values', () => {
    expect(getWorkbenchSchemaFormFieldDefaultValue(fields[0])).toBe('Workbench');
    expect(
      getWorkbenchSchemaFormFieldDefaultValue({
        id: 'enabled',
        label: 'Enabled',
        type: 'checkbox',
      }),
    ).toBe(false);
    expect(coerceWorkbenchSchemaFormFieldValue(fields[3], '12')).toBe(12);
    expect(coerceWorkbenchSchemaFormFieldValue(fields[3], 'not-a-number')).toBe('');

    expect(
      normalizeWorkbenchSchemaFormValues(fields, {
        confirmActions: '',
        density: 'compact',
        maxItems: '8',
      }),
    ).toEqual({
      confirmActions: false,
      density: 'compact',
      displayName: 'Workbench',
      maxItems: 8,
    });
  });

  it('computes required and custom validation errors', () => {
    const values = normalizeWorkbenchSchemaFormValues(fields, {
      displayName: '',
      maxItems: 0,
    });

    expect(
      getWorkbenchSchemaFormFieldError({
        field: fields[0],
        value: values.displayName,
        values,
      }),
    ).toBe('This field is required.');
    expect(getWorkbenchSchemaFormErrors(fields, values)).toEqual({
      displayName: 'This field is required.',
      maxItems: 'Use a value greater than zero.',
    });
  });

  it('checks submittable state', () => {
    expect(isWorkbenchSchemaFormSubmittable({ errors: {} })).toBe(true);
    expect(isWorkbenchSchemaFormSubmittable({ disabled: true, errors: {} })).toBe(false);
    expect(isWorkbenchSchemaFormSubmittable({ errors: { displayName: 'Required' } })).toBe(false);
    expect(isWorkbenchSchemaFormSubmittable({ errors: {}, readOnly: true })).toBe(false);
  });
});

describe('WorkbenchSchemaForm rendering', () => {
  it('renders mixed field types and actions', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSchemaForm
        fields={fields}
        values={{
          confirmActions: true,
          density: 'compact',
          displayName: 'Workbench Kit',
          maxItems: 20,
        }}
      />,
    );

    expect(markup).toContain('Display name');
    expect(markup).toContain('Density');
    expect(markup).toContain('Confirm before side effects');
    expect(markup).toContain('Maximum items');
    expect(markup).toContain('value="Workbench Kit"');
    expect(markup).toContain('type="number"');
    expect(markup).toContain('data-variant="primary"');
  });

  it('renders validation, disabled, read-only, and empty states', () => {
    const invalidMarkup = renderToStaticMarkup(
      <WorkbenchSchemaForm fields={fields} values={{ displayName: '', maxItems: 0 }} />,
    );
    const readOnlyMarkup = renderToStaticMarkup(
      <WorkbenchSchemaForm fields={fields} readOnly values={{ displayName: 'Read only' }} />,
    );
    const emptyMarkup = renderToStaticMarkup(<WorkbenchSchemaForm fields={[]} />);

    expect(invalidMarkup).toContain('This field is required.');
    expect(invalidMarkup).toContain('Use a value greater than zero.');
    expect(readOnlyMarkup).toContain('readOnly=""');
    expect(readOnlyMarkup).toContain('data-readonly="true"');
    expect(emptyMarkup).toContain('No settings fields');
  });
});
