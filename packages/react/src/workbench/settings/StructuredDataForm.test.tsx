import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  WorkbenchStructuredDataForm,
  coerceWorkbenchStructuredDataFormFieldValue,
  getWorkbenchStructuredDataFormErrors,
  getWorkbenchStructuredDataValue,
  normalizeWorkbenchStructuredDataFormData,
  setWorkbenchStructuredDataValue,
  type WorkbenchStructuredDataFormSection,
} from './StructuredDataForm';

const sections: WorkbenchStructuredDataFormSection[] = [
  {
    description: 'Generic profile metadata for a workbench surface.',
    fields: [
      {
        defaultValue: 'Workbench Kit',
        id: 'profileName',
        label: 'Profile name',
        path: ['profile', 'name'],
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
        path: ['preferences', 'density'],
        type: 'select',
      },
      {
        defaultValue: true,
        id: 'confirmSideEffects',
        label: 'Confirm side effects',
        path: ['permissions', 'confirmSideEffects'],
        type: 'checkbox',
      },
      {
        defaultValue: 12,
        id: 'maxItems',
        label: 'Maximum items',
        min: 1,
        path: ['preferences', 'maxItems'],
        type: 'number',
        validate: (value) =>
          typeof value === 'number' && value < 1 ? 'Use a positive number.' : undefined,
      },
    ],
    id: 'profile',
    title: 'Profile',
  },
  {
    id: 'resources',
    tables: [
      {
        columns: [
          { id: 'name', label: 'Name', path: ['name'] },
          { id: 'status', label: 'Status', path: ['status'] },
          { align: 'end', id: 'count', label: 'Count', path: ['count'] },
        ],
        id: 'resourceTable',
        label: 'Resources',
        rows: [
          {
            data: { count: 3, name: 'Open files', status: 'Ready' },
            id: 'open-files',
          },
        ],
      },
    ],
    title: 'Resources',
  },
];

const maxItemsField = sections[0].fields?.find((field) => field.id === 'maxItems');

if (!maxItemsField) {
  throw new Error('Expected maxItems test field.');
}

describe('WorkbenchStructuredDataForm helpers', () => {
  it('reads, writes, normalizes, and coerces nested data', () => {
    const data = setWorkbenchStructuredDataValue({}, ['profile', 'name'], 'Workbench');

    expect(data).toEqual({ profile: { name: 'Workbench' } });
    expect(getWorkbenchStructuredDataValue(data, ['profile', 'name'])).toBe('Workbench');
    expect(
      normalizeWorkbenchStructuredDataFormData(sections, {
        preferences: { maxItems: '8' },
      }),
    ).toEqual({
      permissions: { confirmSideEffects: true },
      preferences: { density: 'comfortable', maxItems: 8 },
      profile: { name: 'Workbench Kit' },
    });
    expect(coerceWorkbenchStructuredDataFormFieldValue(maxItemsField, '8')).toBe(8);
    expect(coerceWorkbenchStructuredDataFormFieldValue(maxItemsField, 'bad')).toBe('');
  });

  it('computes required and custom field errors', () => {
    expect(
      getWorkbenchStructuredDataFormErrors(sections, {
        preferences: { maxItems: 0 },
        profile: { name: '' },
      }),
    ).toEqual({
      maxItems: 'Use a positive number.',
      profileName: 'This field is required.',
    });
  });
});

describe('WorkbenchStructuredDataForm rendering', () => {
  it('renders sections, fields, tables, and actions', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchStructuredDataForm
        ariaLabel="Structured data sections"
        sections={sections}
        data={{
          permissions: { confirmSideEffects: false },
          preferences: { density: 'compact', maxItems: 16 },
          profile: { name: 'Workbench Runtime' },
        }}
      />,
    );

    expect(markup).toContain('ui-workbench-structured-data-form');
    expect(markup).toContain('href="#profile"');
    expect(markup).toContain('Profile name');
    expect(markup).toContain('value="Workbench Runtime"');
    expect(markup).toContain('Resources');
    expect(markup).toContain('Open files');
    expect(markup).toContain('data-align="end"');
    expect(markup).toContain('data-variant="primary"');
  });

  it('renders read-only, validation, and empty states', () => {
    const invalidMarkup = renderToStaticMarkup(
      <WorkbenchStructuredDataForm
        ariaLabel="Structured data sections"
        sections={sections}
        data={{ preferences: { maxItems: 0 }, profile: { name: '' } }}
      />,
    );
    const readOnlyMarkup = renderToStaticMarkup(
      <WorkbenchStructuredDataForm
        ariaLabel="Structured data sections"
        readOnly
        sections={sections}
      />,
    );
    const emptyMarkup = renderToStaticMarkup(
      <WorkbenchStructuredDataForm ariaLabel="Structured data sections" sections={[]} />,
    );

    expect(invalidMarkup).toContain('This field is required.');
    expect(invalidMarkup).toContain('Use a positive number.');
    expect(readOnlyMarkup).toContain('data-readonly="true"');
    expect(readOnlyMarkup).toContain('readOnly=""');
    expect(emptyMarkup).toContain('No structured data sections');
  });
});
