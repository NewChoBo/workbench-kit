import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  WorkbenchStructuredDataForm,
  WorkbenchStructuredDataSchemaFieldInput,
  WorkbenchStructuredDataTextArrayInput,
  appendWorkbenchStructuredDataSchemaTableRow,
  asWorkbenchStructuredDataRecord,
  booleanWorkbenchStructuredDataSchemaFieldValue,
  coerceWorkbenchStructuredDataFormFieldValue,
  coerceWorkbenchStructuredDataSchemaFieldValue,
  createWorkbenchStructuredDataSchemaDocumentEmptyRow,
  createWorkbenchStructuredDataSchemaEmptyRow,
  createWorkbenchStructuredDataSchemaDocumentSampleData,
  createWorkbenchStructuredDataSchemaFallbackSection,
  formatWorkbenchStructuredDataSchemaValue,
  formatWorkbenchStructuredDataSchemaLabel,
  getWorkbenchStructuredDataFormErrors,
  getWorkbenchStructuredDataSchemaDocumentColumnDefinition,
  getWorkbenchStructuredDataSchemaDocumentColumnLabel,
  getWorkbenchStructuredDataSchemaDocumentFieldDefinition,
  getWorkbenchStructuredDataSchemaDocumentFieldLabel,
  getWorkbenchStructuredDataSchemaDocumentPanelData,
  getWorkbenchStructuredDataSchemaDocumentSectionValue,
  getWorkbenchStructuredDataSchemaDocumentSections,
  getWorkbenchStructuredDataSchemaDocumentTableColumns,
  getWorkbenchStructuredDataSchemaDocumentTableDefinition,
  getWorkbenchStructuredDataSchemaFieldDataPath,
  getWorkbenchStructuredDataSchemaFieldControl,
  getWorkbenchStructuredDataSchemaFieldDefaultValue,
  getWorkbenchStructuredDataSchemaFieldDescription,
  getWorkbenchStructuredDataSchemaFieldDefinition,
  getWorkbenchStructuredDataSchemaSectionAnchorId,
  getWorkbenchStructuredDataSchemaSectionId,
  getWorkbenchStructuredDataSchemaSectionPath,
  getWorkbenchStructuredDataSchemaTableCellPath,
  getWorkbenchStructuredDataSchemaTableColumns,
  getWorkbenchStructuredDataSchemaTablePath,
  getWorkbenchStructuredDataSchemaTableRowKey,
  getWorkbenchStructuredDataSchemaTableRows,
  getWorkbenchStructuredDataValue,
  normalizeWorkbenchStructuredDataFormData,
  removeWorkbenchStructuredDataSchemaTableRow,
  setWorkbenchStructuredDataPathOrRootValue,
  setWorkbenchStructuredDataValue,
  stringifyWorkbenchStructuredDataSchemaFieldValue,
  type WorkbenchStructuredDataFormSection,
} from './StructuredDataForm';
import { WorkbenchStructuredDataSchemaPanel } from './StructuredDataSchemaPanel';

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
        addLabel: 'Add tag',
        defaultValue: ['workspace', '  runtime  '],
        id: 'tags',
        itemLabel: 'Tag',
        label: 'Tags',
        path: ['profile', 'tags'],
        type: 'text-array',
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
const tagsField = sections[0].fields?.find((field) => field.id === 'tags');

if (!maxItemsField || !tagsField) {
  throw new Error('Expected structured data test fields.');
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
      profile: { name: 'Workbench Kit', tags: ['workspace', '  runtime  '] },
    });
    expect(coerceWorkbenchStructuredDataFormFieldValue(maxItemsField, '8')).toBe(8);
    expect(coerceWorkbenchStructuredDataFormFieldValue(maxItemsField, 'bad')).toBe('');
    expect(
      coerceWorkbenchStructuredDataFormFieldValue(tagsField, ['  keep whitespace  ', '', 4]),
    ).toEqual(['  keep whitespace  ', '', '4']);
  });

  it('reads and writes nested array indices immutably', () => {
    const data = {
      request: {
        fields: [{ name: 'id' }, { name: 'status' }],
      },
    };

    const nextData = setWorkbenchStructuredDataValue(
      data,
      ['request', 'fields', 1, 'name'],
      'code',
    );

    expect(getWorkbenchStructuredDataValue(nextData, ['request', 'fields', '1', 'name'])).toBe(
      'code',
    );
    expect(data.request.fields[1].name).toBe('status');
  });

  it('interprets lightweight schema field definitions', () => {
    expect(getWorkbenchStructuredDataSchemaFieldControl({ enum: ['A', 'B'] })).toBe('select');
    expect(getWorkbenchStructuredDataSchemaFieldControl({ format: 'date' })).toBe('date');
    expect(getWorkbenchStructuredDataSchemaFieldControl({ type: 'boolean' })).toBe('checkbox');
    expect(getWorkbenchStructuredDataSchemaFieldControl({ type: 'array' })).toBe('textarea');
    expect(getWorkbenchStructuredDataSchemaFieldDefaultValue({ type: 'integer' })).toBe(0);
    expect(getWorkbenchStructuredDataSchemaFieldDefaultValue({ default: 'custom' })).toBe('custom');
    expect(stringifyWorkbenchStructuredDataSchemaFieldValue(['A', 'B'], { type: 'array' })).toBe(
      'A\nB',
    );
    expect(
      stringifyWorkbenchStructuredDataSchemaFieldValue({ enabled: true }, { type: 'object' }),
    ).toContain('"enabled": true');
    expect(coerceWorkbenchStructuredDataSchemaFieldValue('12', { type: 'number' })).toBe(12);
    expect(coerceWorkbenchStructuredDataSchemaFieldValue('', { type: 'number' })).toBeNull();
    expect(coerceWorkbenchStructuredDataSchemaFieldValue('Y', { enum: ['N', 'Y'] })).toBe('Y');
    expect(booleanWorkbenchStructuredDataSchemaFieldValue('Y')).toBe(true);
    expect(formatWorkbenchStructuredDataSchemaValue(false)).toBe('N');
    expect(formatWorkbenchStructuredDataSchemaValue(['A', 'B'])).toBe('A\nB');
  });

  it('derives lightweight schema sections, fields, and table view data', () => {
    const section = {
      columns: ['name', 'required'],
      dataPath: 'request.fields',
      id: 'requestFields',
      sectionKey: 'request',
    };
    const properties: Record<string, { title?: string; type?: string }> = {
      'request.fields.name': { title: 'Name', type: 'string' },
      required: { type: 'boolean' },
    };
    const rows = getWorkbenchStructuredDataSchemaTableRows([{ name: 'id', required: true }, 'raw']);
    const objectRows = getWorkbenchStructuredDataSchemaTableRows({
      rowA: { name: 'code' },
    });

    expect(asWorkbenchStructuredDataRecord({ ok: true })).toEqual({ ok: true });
    expect(asWorkbenchStructuredDataRecord(['not-record'])).toBeNull();
    expect(getWorkbenchStructuredDataSchemaSectionId(section)).toBe('requestFields');
    expect(getWorkbenchStructuredDataSchemaSectionPath(section)).toBe('request.fields');
    expect(getWorkbenchStructuredDataSchemaSectionPath({ id: 'root', dataPath: '' })).toBe('');
    expect(getWorkbenchStructuredDataSchemaFieldDataPath({ id: 'root', dataPath: '' }, 'title')).toBe('title');
    expect(getWorkbenchStructuredDataSchemaFieldDataPath(section, 'name')).toBe(
      'request.fields.name',
    );
    expect(formatWorkbenchStructuredDataSchemaLabel('physical_name')).toBe('physical name');
    expect(
      getWorkbenchStructuredDataSchemaFieldDefinition({
        fieldPath: 'name',
        properties,
        section,
      })?.title,
    ).toBe('Name');
    expect(rows).toEqual([{ name: 'id', required: true }, { value: 'raw' }]);
    expect(objectRows).toEqual([{ id: 'rowA', name: 'code' }]);
    expect(
      getWorkbenchStructuredDataSchemaTableColumns({
        maxColumns: 2,
        preferredColumns: ['required', 'name'],
        rows,
      }),
    ).toEqual(['required', 'name']);
    expect(
      createWorkbenchStructuredDataSchemaEmptyRow({
        columns: ['name', 'required'],
        getDefinition: (column) => properties[column],
      }),
    ).toEqual({ name: '', required: false });
    expect(getWorkbenchStructuredDataSchemaTablePath(section)).toEqual(['request', 'fields']);
    expect(
      getWorkbenchStructuredDataSchemaTableRowKey({
        row: { id: 'rowA' },
        rowIndex: 3,
        value: { rowA: { id: 'rowA' } },
      }),
    ).toBe('rowA');
    expect(
      getWorkbenchStructuredDataSchemaTableCellPath({
        column: 'name',
        rowKey: '0',
        section,
      }),
    ).toEqual(['request', 'fields', '0', 'name']);
    expect(
      removeWorkbenchStructuredDataSchemaTableRow({
        rowIndex: 0,
        rowKey: '0',
        value: [{ name: 'id' }, { name: 'code' }],
      }),
    ).toEqual([{ name: 'code' }]);
    expect(
      appendWorkbenchStructuredDataSchemaTableRow({
        row: { name: 'status' },
        rowKey: 'row_1',
        value: { row_0: { name: 'id' } },
      }),
    ).toEqual({
      row_0: { name: 'id' },
      row_1: { id: 'row_1', name: 'status' },
    });
    expect(
      setWorkbenchStructuredDataPathOrRootValue({
        data: { request: { fields: [{ name: 'id' }] } },
        path: ['request', 'fields', 0, 'name'],
        value: 'code',
      }),
    ).toEqual({ request: { fields: [{ name: 'code' }] } });
    expect(
      setWorkbenchStructuredDataPathOrRootValue({
        data: { value: 'old' },
        path: [],
        value: ['root'],
      }),
    ).toEqual(['root']);
  });

  it('derives schema document sections, section values, and sample data', () => {
    const schema = {
      activePattern: 'DBtoDB',
      pattern: 'fallback',
      sampleDrafts: {
        REST: { summary: { name: 'draft' } },
      },
      patterns: [
        {
          pattern: 'DBtoDB',
          sections: [{ fields: ['name'], sectionKey: 'patternOnly', title: 'Pattern only' }],
        },
      ],
      schema: {
        properties: {
          'summary.name': { default: 'Untitled', title: 'Name' },
          required: { type: 'boolean' },
        },
        tables: {
          'request.fields': {
            items: {
              name: { default: 'id' },
              required: { type: 'boolean' },
            },
          },
        },
      },
      ui: {
        patterns: {
          DBtoDB: {
            sections: [
              { fields: ['name'], sectionKey: 'summary', title: 'Summary' },
              {
                columns: ['name', 'required'],
                dataPath: 'request.fields',
                sectionKey: 'requestFields',
                title: 'Fields',
                type: 'table',
              },
            ],
          },
        },
      },
    };
    const sections = getWorkbenchStructuredDataSchemaDocumentSections(schema, 'DBtoDB');
    const sample = createWorkbenchStructuredDataSchemaDocumentSampleData(schema, 'DBtoDB');

    expect(sections.map((section) => section.title)).toEqual(['Summary', 'Fields']);
    expect(
      getWorkbenchStructuredDataSchemaDocumentFieldDefinition(schema, sections[0], 'name')?.title,
    ).toBe('Name');
    expect(getWorkbenchStructuredDataSchemaDocumentFieldLabel(schema, sections[0], 'name')).toBe(
      'Name',
    );
    expect(
      getWorkbenchStructuredDataSchemaFieldDescription({ markdownDescription: 'Markdown' }),
    ).toBe('Markdown');
    expect(
      getWorkbenchStructuredDataSchemaDocumentTableDefinition(schema, sections[1])?.items?.name
        ?.default,
    ).toBe('id');
    expect(
      getWorkbenchStructuredDataSchemaDocumentColumnDefinition(schema, sections[1], 'name')
        ?.default,
    ).toBe('id');
    expect(
      getWorkbenchStructuredDataSchemaDocumentColumnLabel(schema, sections[1], 'required'),
    ).toBe('required');
    expect(
      getWorkbenchStructuredDataSchemaDocumentTableColumns({
        preferredColumns: ['required', 'name'],
        rows: [{ name: 'id', required: true }],
        schema,
        section: sections[1],
      }),
    ).toEqual(['name', 'required']);
    expect(
      createWorkbenchStructuredDataSchemaDocumentEmptyRow({
        columns: ['name', 'required'],
        schema,
        section: sections[1],
      }),
    ).toEqual({ name: 'id', required: false });
    expect(
      getWorkbenchStructuredDataSchemaDocumentSectionValue({
        aliases: { requestFields: [['request', 'fields']] },
        data: { request: { fields: [{ name: 'code' }] } },
        section: { sectionKey: 'requestFields' },
      }),
    ).toEqual([{ name: 'code' }]);
    expect(sample).toEqual({
      request: { fields: [{ name: 'id', required: false }] },
      summary: { name: 'Untitled' },
    });
    expect(
      getWorkbenchStructuredDataSchemaDocumentPanelData({
        data: null,
        pattern: 'REST',
        schema,
      }),
    ).toEqual({ summary: { name: 'draft' } });
    expect(
      createWorkbenchStructuredDataSchemaFallbackSection({ data: { a: 1 }, title: 'Data' }),
    ).toEqual({
      fieldCount: 1,
      sectionKey: 'data',
      title: 'Data',
      type: 'form',
    });
    expect(
      getWorkbenchStructuredDataSchemaSectionAnchorId({
        index: 0,
        panelId: 'panel',
        section: { sectionKey: 'summary', title: 'Summary' },
      }),
    ).toBe('panel-section-0-summary');
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
          profile: { name: 'Workbench Runtime', tags: ['alpha', ' beta '] },
        }}
      />,
    );

    expect(markup).toContain('ui-workbench-structured-data-form');
    expect(markup).toContain('href="#profile"');
    expect(markup).toContain('Profile name');
    expect(markup).toContain('value="Workbench Runtime"');
    expect(markup).toContain('aria-label="Tag 1"');
    expect(markup).toContain('value=" beta "');
    expect(markup).toContain('Add tag');
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

  it('renders standalone text-array input controls', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchStructuredDataTextArrayInput
        addLabel="Add header"
        ariaLabel="Header"
        emptyLabel="No headers"
        placeholder="Header value"
        value={['X-Request-Id', '']}
      />,
    );

    expect(markup).toContain('ui-workbench-structured-data-form__array');
    expect(markup).toContain('aria-label="Header 1"');
    expect(markup).toContain('value="X-Request-Id"');
    expect(markup).toContain('placeholder="Header value"');
    expect(markup).toContain('Add header');
  });

  it('renders standalone schema field inputs', () => {
    const selectMarkup = renderToStaticMarkup(
      <WorkbenchStructuredDataSchemaFieldInput
        className="custom-control"
        definition={{ enum: ['A', 'B'], title: 'Status' }}
        fieldPath="status"
        value="A"
      />,
    );
    const textareaMarkup = renderToStaticMarkup(
      <WorkbenchStructuredDataSchemaFieldInput
        className="custom-control"
        definition={{ title: 'Payload', type: 'object', ui: { control: 'textarea', rows: 8 } }}
        fieldPath="payload"
        textareaClassName="custom-textarea"
        value={{ ok: true }}
      />,
    );
    const arrayMarkup = renderToStaticMarkup(
      <WorkbenchStructuredDataSchemaFieldInput
        addTextArrayLabel="Add value"
        definition={{ items: { type: 'string' }, title: 'Headers', type: 'array' }}
        fieldPath="headers"
        removeTextArrayLabel="Delete"
        value={['X-Request-Id']}
      />,
    );

    expect(selectMarkup).toContain('<select');
    expect(selectMarkup).toContain('aria-label="Status"');
    expect(selectMarkup).toContain('custom-control');
    expect(textareaMarkup).toContain('<textarea');
    expect(textareaMarkup).toContain('custom-textarea');
    expect(textareaMarkup).toContain('rows="8"');
    expect(arrayMarkup).toContain('ui-workbench-structured-data-form__array');
    expect(arrayMarkup).toContain('Add value');
  });

  it('renders a schema document panel', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchStructuredDataSchemaPanel
        ariaLabel="Schema sections"
        classNames={{
          root: 'custom-root',
          section: 'custom-section',
          settingControl: 'custom-control',
          tableEditor: 'custom-table',
          tableGrid: 'custom-grid',
          tableHeaderRow: 'custom-row custom-row-head',
          tableRow: 'custom-row',
        }}
        data={{
          basic: { title: 'Agreement' },
          fields: [{ name: 'id', type: 'string' }],
        }}
        labels={{ addRow: 'Add row', deleteRow: 'Delete row' }}
        schema={{
          schema: {
            properties: {
              'basic.title': { title: 'Title' },
            },
            sections: [
              { fields: ['title'], sectionKey: 'basic', title: 'Basic', type: 'form' },
              { columns: ['name', 'type'], sectionKey: 'fields', title: 'Fields', type: 'table' },
            ],
            tables: {
              fields: {
                items: {
                  name: { title: 'Name' },
                  type: { enum: ['string', 'number'], title: 'Type' },
                },
              },
            },
          },
        }}
      />,
    );

    expect(markup).toContain('custom-root');
    expect(markup).toContain('ui-workbench-structured-data-schema-panel');
    expect(markup).toContain('custom-section');
    expect(markup).toContain('ui-workbench-structured-data-schema-panel__section');
    expect(markup).toContain('Basic');
    expect(markup).toContain('Fields');
    expect(markup).toContain('custom-table');
    expect(markup).toContain('custom-row custom-row-head');
    expect(markup).toContain('aria-label="Title"');
    expect(markup).toContain('Agreement');
    expect(markup).toContain('Delete row');
  });
});
