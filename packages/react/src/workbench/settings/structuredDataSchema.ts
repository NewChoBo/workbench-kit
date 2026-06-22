import {
  asWorkbenchStructuredDataRecord,
  getWorkbenchStructuredDataValue,
  isWorkbenchStructuredDataRecord,
  setWorkbenchStructuredDataPathOrRootValue,
  setWorkbenchStructuredDataValue,
} from '@workbench-kit/workspace';
import type {
  WorkbenchStructuredDataRecord,
  WorkbenchStructuredDataSchemaDocument,
  WorkbenchStructuredDataSchemaFieldDefinition,
  WorkbenchStructuredDataSchemaSectionAliases,
  WorkbenchStructuredDataSchemaSectionSummary,
} from './structuredDataSchemaTypes';
import {
  formatWorkbenchStructuredDataSchemaLabel,
  getWorkbenchStructuredDataSchemaFieldDefaultValue,
} from './structuredDataSchemaField';
import {
  getWorkbenchStructuredDataSchemaFieldDataPath,
  getWorkbenchStructuredDataSchemaFieldDefinition,
  getWorkbenchStructuredDataSchemaSectionFieldLabel,
  getWorkbenchStructuredDataSchemaSectionPath,
} from './structuredDataSchemaSection';
import {
  createWorkbenchStructuredDataSchemaEmptyRow,
  getWorkbenchStructuredDataSchemaTableColumns,
} from './structuredDataSchemaTable';
export {
  coerceWorkbenchStructuredDataFormFieldValue,
  getWorkbenchStructuredDataFormErrors,
  getWorkbenchStructuredDataFormFieldDefaultValue,
  getWorkbenchStructuredDataFormFieldError,
  getWorkbenchStructuredDataFormFields,
  isWorkbenchStructuredDataFormSubmittable,
  normalizeWorkbenchStructuredDataFormData,
} from './structuredDataFormModel';

export {
  booleanWorkbenchStructuredDataSchemaFieldValue,
  coerceWorkbenchStructuredDataSchemaFieldValue,
  formatWorkbenchStructuredDataSchemaLabel,
  formatWorkbenchStructuredDataSchemaValue,
  getWorkbenchStructuredDataSchemaFieldControl,
  getWorkbenchStructuredDataSchemaFieldDefaultValue,
  stringifyWorkbenchStructuredDataSchemaFieldValue,
} from './structuredDataSchemaField';
export {
  buildWorkbenchStructuredDataSchemaSelectOptions,
  hasWorkbenchStructuredDataSchemaSelectOptions,
  isWorkbenchStructuredDataSchemaColorField,
  shouldUseWorkbenchStructuredDataSchemaRadioControl,
  validateWorkbenchStructuredDataSchemaFieldValue,
} from './structuredDataSchemaValidation';
export {
  getWorkbenchStructuredDataSchemaFieldDataPath,
  getWorkbenchStructuredDataSchemaFieldDefinition,
  getWorkbenchStructuredDataSchemaSectionAnchorId,
  getWorkbenchStructuredDataSchemaSectionId,
  getWorkbenchStructuredDataSchemaSectionPath,
  slugWorkbenchStructuredDataSchemaAnchor,
} from './structuredDataSchemaSection';
export {
  appendWorkbenchStructuredDataSchemaTableRow,
  createWorkbenchStructuredDataSchemaEmptyRow,
  getWorkbenchStructuredDataSchemaTableCellPath,
  getWorkbenchStructuredDataSchemaTableColumns,
  getWorkbenchStructuredDataSchemaTablePath,
  getWorkbenchStructuredDataSchemaTableRowKey,
  getWorkbenchStructuredDataSchemaTableRows,
  removeWorkbenchStructuredDataSchemaTableRow,
} from './structuredDataSchemaTable';

export type {
  WorkbenchStructuredDataFieldType,
  WorkbenchStructuredDataFieldValue,
  WorkbenchStructuredDataFormCancelContext,
  WorkbenchStructuredDataFormCheckboxField,
  WorkbenchStructuredDataFormErrors,
  WorkbenchStructuredDataFormField,
  WorkbenchStructuredDataFormFieldBase,
  WorkbenchStructuredDataFormFieldChangeContext,
  WorkbenchStructuredDataFormNumberField,
  WorkbenchStructuredDataFormOption,
  WorkbenchStructuredDataFormProps,
  WorkbenchStructuredDataFormSection,
  WorkbenchStructuredDataFormSelectField,
  WorkbenchStructuredDataFormSubmitContext,
  WorkbenchStructuredDataFormTextArrayField,
  WorkbenchStructuredDataFormTextField,
  WorkbenchStructuredDataPath,
  WorkbenchStructuredDataRecord,
  WorkbenchStructuredDataSchemaDocument,
  WorkbenchStructuredDataSchemaFieldControl,
  WorkbenchStructuredDataSchemaFieldDefinition,
  WorkbenchStructuredDataSchemaFieldInputProps,
  WorkbenchStructuredDataSchemaSectionAliases,
  WorkbenchStructuredDataSchemaSectionSummary,
  WorkbenchStructuredDataSchemaTableColumnInput,
  WorkbenchStructuredDataSchemaTableDefinition,
  WorkbenchStructuredDataSchemaTableRowKeyInput,
  WorkbenchStructuredDataTable,
  WorkbenchStructuredDataTableCellContext,
  WorkbenchStructuredDataTableColumn,
  WorkbenchStructuredDataTableRow,
  WorkbenchStructuredDataTextArrayInputProps,
} from './structuredDataSchemaTypes';
export {
  asWorkbenchStructuredDataRecord,
  getWorkbenchStructuredDataValue,
  isWorkbenchStructuredDataRecord,
  setWorkbenchStructuredDataPathOrRootValue,
  setWorkbenchStructuredDataValue,
};

export function getWorkbenchStructuredDataSchemaDocumentSections(
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined,
  pattern: string,
) {
  const activePatternSchema = schema?.patterns?.find((candidate) => candidate.pattern === pattern);
  return (
    schema?.ui?.patterns?.[pattern]?.sections ??
    schema?.schema?.sections ??
    activePatternSchema?.sections ??
    []
  );
}

export function getWorkbenchStructuredDataSchemaDocumentTableDefinition(
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined,
  section: WorkbenchStructuredDataSchemaSectionSummary,
) {
  const tablePath = getWorkbenchStructuredDataSchemaSectionPath(section);
  return tablePath ? schema?.schema?.tables?.[tablePath] : undefined;
}

export function getWorkbenchStructuredDataSchemaDocumentFieldDefinition(
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined,
  section: WorkbenchStructuredDataSchemaSectionSummary,
  fieldPath: string,
) {
  return getWorkbenchStructuredDataSchemaFieldDefinition({
    fieldPath,
    properties: schema?.schema?.properties,
    section,
  });
}

export function getWorkbenchStructuredDataSchemaFieldDescription(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
) {
  return definition?.description ?? definition?.markdownDescription;
}

export function getWorkbenchStructuredDataSchemaDocumentFieldLabel(
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined,
  section: WorkbenchStructuredDataSchemaSectionSummary,
  fieldPath: string,
) {
  return (
    getWorkbenchStructuredDataSchemaDocumentFieldDefinition(schema, section, fieldPath)?.title ??
    getWorkbenchStructuredDataSchemaSectionFieldLabel(fieldPath)
  );
}

export function getWorkbenchStructuredDataSchemaDocumentColumnDefinition(
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined,
  section: WorkbenchStructuredDataSchemaSectionSummary,
  column: string,
) {
  return (
    getWorkbenchStructuredDataSchemaDocumentTableDefinition(schema, section)?.items?.[column] ??
    getWorkbenchStructuredDataSchemaDocumentFieldDefinition(schema, section, column)
  );
}

export function getWorkbenchStructuredDataSchemaDocumentColumnLabel(
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined,
  section: WorkbenchStructuredDataSchemaSectionSummary,
  column: string,
) {
  return (
    getWorkbenchStructuredDataSchemaDocumentColumnDefinition(schema, section, column)?.title ??
    formatWorkbenchStructuredDataSchemaLabel(column)
  );
}

export function getWorkbenchStructuredDataSchemaDocumentSectionValue({
  aliases = {},
  data,
  section,
}: {
  aliases?: WorkbenchStructuredDataSchemaSectionAliases | undefined;
  data: unknown;
  section: WorkbenchStructuredDataSchemaSectionSummary;
}) {
  const sectionKey = getWorkbenchStructuredDataSchemaSectionPath(section);
  const record = asWorkbenchStructuredDataRecord(data);
  if (!sectionKey || !record) return sectionKey ? null : data;
  if (sectionKey in record) return record[sectionKey];

  const directValue = getWorkbenchStructuredDataValue(data, sectionKey.split('.'));
  if (directValue !== null && directValue !== undefined) return directValue;

  for (const path of aliases[sectionKey] ?? []) {
    if (!path.length) return data;
    const value = getWorkbenchStructuredDataValue(data, path);
    if (value !== null && value !== undefined) return value;
  }

  return null;
}

export function getWorkbenchStructuredDataSchemaDocumentTableColumns({
  maxColumns,
  preferredColumns,
  rows,
  schema,
  section,
}: {
  maxColumns?: number | undefined;
  preferredColumns?: readonly string[] | undefined;
  rows: readonly WorkbenchStructuredDataRecord[];
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined;
  section: WorkbenchStructuredDataSchemaSectionSummary;
}) {
  const schemaColumns = Object.keys(
    getWorkbenchStructuredDataSchemaDocumentTableDefinition(schema, section)?.items ?? {},
  );

  return getWorkbenchStructuredDataSchemaTableColumns({
    maxColumns,
    preferredColumns,
    rows,
    schemaColumns,
    sectionColumns: section.columns,
  });
}

export function createWorkbenchStructuredDataSchemaDocumentEmptyRow({
  columns,
  schema,
  section,
}: {
  columns: readonly string[];
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined;
  section: WorkbenchStructuredDataSchemaSectionSummary;
}) {
  return createWorkbenchStructuredDataSchemaEmptyRow({
    columns,
    getDefinition: (column) =>
      getWorkbenchStructuredDataSchemaDocumentColumnDefinition(schema, section, column),
  });
}

export function createWorkbenchStructuredDataSchemaDocumentSampleData(
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined,
  pattern: string,
) {
  const sections = getWorkbenchStructuredDataSchemaDocumentSections(schema, pattern);
  return sections.reduce<WorkbenchStructuredDataRecord>((sample, section) => {
    const path = getWorkbenchStructuredDataSchemaSectionPath(section);
    if (!path) return sample;

    if (section.type === 'table') {
      const schemaTable = getWorkbenchStructuredDataSchemaDocumentTableDefinition(schema, section);
      const columns = section.columns?.length
        ? section.columns
        : Object.keys(schemaTable?.items ?? {});

      return setWorkbenchStructuredDataValue(sample, path.split('.'), [
        createWorkbenchStructuredDataSchemaDocumentEmptyRow({
          columns,
          schema,
          section,
        }),
      ]);
    }

    return (section.fields ?? []).reduce<WorkbenchStructuredDataRecord>((nextSample, fieldPath) => {
      const definition = getWorkbenchStructuredDataSchemaDocumentFieldDefinition(
        schema,
        section,
        fieldPath,
      );
      return setWorkbenchStructuredDataValue(
        nextSample,
        getWorkbenchStructuredDataSchemaFieldDataPath(section, fieldPath).split('.'),
        getWorkbenchStructuredDataSchemaFieldDefaultValue(definition),
      );
    }, sample);
  }, {});
}

export function createWorkbenchStructuredDataSchemaFallbackSection({
  data,
  sectionKey = 'data',
  title,
}: {
  data: unknown;
  sectionKey?: string | undefined;
  title: string;
}): WorkbenchStructuredDataSchemaSectionSummary {
  const record = asWorkbenchStructuredDataRecord(data);
  return {
    fieldCount: record ? Object.keys(record).length : undefined,
    sectionKey,
    title,
    type: Array.isArray(data) ? 'table' : 'form',
  };
}

export function getWorkbenchStructuredDataSchemaDocumentPanelData({
  data,
  pattern,
  schema,
}: {
  data: unknown;
  pattern: string;
  schema: WorkbenchStructuredDataSchemaDocument | null | undefined;
}) {
  return (
    data ??
    schema?.sampleDrafts?.[pattern] ??
    schema?.sampleDraft ??
    createWorkbenchStructuredDataSchemaDocumentSampleData(schema, pattern)
  );
}
