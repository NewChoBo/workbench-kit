import type { ReactNode } from 'react';
import {
  asWorkbenchStructuredDataRecord,
  getWorkbenchStructuredDataValue,
  isWorkbenchStructuredDataRecord,
  setWorkbenchStructuredDataPathOrRootValue,
  setWorkbenchStructuredDataValue,
} from '@workbench-kit/workspace';
import type {
  WorkbenchStructuredDataFieldValue,
  WorkbenchStructuredDataFormErrors,
  WorkbenchStructuredDataFormField,
  WorkbenchStructuredDataFormSection,
  WorkbenchStructuredDataRecord,
  WorkbenchStructuredDataSchemaDocument,
  WorkbenchStructuredDataSchemaFieldDefinition,
  WorkbenchStructuredDataSchemaSectionAliases,
  WorkbenchStructuredDataSchemaSectionSummary,
  WorkbenchStructuredDataSchemaTableColumnInput,
  WorkbenchStructuredDataSchemaTableRowKeyInput,
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
  getWorkbenchStructuredDataSchemaFieldDataPath,
  getWorkbenchStructuredDataSchemaFieldDefinition,
  getWorkbenchStructuredDataSchemaSectionAnchorId,
  getWorkbenchStructuredDataSchemaSectionId,
  getWorkbenchStructuredDataSchemaSectionPath,
  slugWorkbenchStructuredDataSchemaAnchor,
} from './structuredDataSchemaSection';

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

const EMPTY_RECORD: WorkbenchStructuredDataRecord = {};

export function getWorkbenchStructuredDataFormFieldDefaultValue(
  field: WorkbenchStructuredDataFormField,
): WorkbenchStructuredDataFieldValue {
  if (field.defaultValue !== undefined) {
    return coerceWorkbenchStructuredDataFormFieldValue(field, field.defaultValue);
  }

  if (field.type === 'checkbox') return false;
  if (field.type === 'text-array') return [];
  return '';
}

export function coerceWorkbenchStructuredDataFormFieldValue(
  field: WorkbenchStructuredDataFormField,
  value: unknown,
): WorkbenchStructuredDataFieldValue {
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'text-array') {
    if (Array.isArray(value)) {
      return value.map((item) => (item === null || item === undefined ? '' : String(item)));
    }

    if (value === '' || value === null || value === undefined) return [];
    return [String(value)];
  }

  if (field.type === 'number') {
    if (value === '' || value === null || value === undefined) return '';
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : '';
  }

  return value === null || value === undefined ? '' : String(value);
}

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

export function getWorkbenchStructuredDataSchemaTableRows(
  value: unknown,
): WorkbenchStructuredDataRecord[] {
  if (Array.isArray(value)) {
    return value.map((item) => asWorkbenchStructuredDataRecord(item) ?? { value: item });
  }

  const record = asWorkbenchStructuredDataRecord(value);
  if (!record) return [];

  const objectEntries = Object.entries(record).filter(([, entry]) =>
    asWorkbenchStructuredDataRecord(entry),
  );
  if (!objectEntries.length) return [];

  return objectEntries.map(([key, entry]) => ({
    id: key,
    ...(asWorkbenchStructuredDataRecord(entry) ?? {}),
  }));
}

export function getWorkbenchStructuredDataSchemaTablePath(
  section: WorkbenchStructuredDataSchemaSectionSummary,
) {
  const tablePath = getWorkbenchStructuredDataSchemaSectionPath(section);
  return tablePath ? tablePath.split('.') : [];
}

export function getWorkbenchStructuredDataSchemaTableRowKey({
  row,
  rowIndex,
  value,
}: WorkbenchStructuredDataSchemaTableRowKeyInput) {
  return Array.isArray(value) ? String(rowIndex) : String(row.id ?? rowIndex);
}

export function getWorkbenchStructuredDataSchemaTableCellPath({
  column,
  rowKey,
  section,
}: {
  column: string;
  rowKey: string;
  section: WorkbenchStructuredDataSchemaSectionSummary;
}) {
  return [...getWorkbenchStructuredDataSchemaTablePath(section), rowKey, column];
}

export function removeWorkbenchStructuredDataSchemaTableRow({
  rowIndex,
  rowKey,
  value,
}: {
  rowIndex: number;
  rowKey: string;
  value: unknown;
}) {
  if (Array.isArray(value)) return value.filter((_, index) => index !== rowIndex);

  const nextRecord = { ...(asWorkbenchStructuredDataRecord(value) ?? {}) };
  delete nextRecord[rowKey];
  return nextRecord;
}

export function appendWorkbenchStructuredDataSchemaTableRow({
  row,
  rowKey,
  value,
}: {
  row: WorkbenchStructuredDataRecord;
  rowKey: string;
  value: unknown;
}) {
  if (Array.isArray(value)) return [...value, row];

  return {
    ...(asWorkbenchStructuredDataRecord(value) ?? {}),
    [rowKey]: { ...row, id: rowKey },
  };
}

export function getWorkbenchStructuredDataSchemaTableColumns({
  maxColumns = 6,
  preferredColumns = [],
  rows,
  schemaColumns = [],
  sectionColumns = [],
}: WorkbenchStructuredDataSchemaTableColumnInput) {
  if (sectionColumns.length) return [...sectionColumns];
  if (schemaColumns.length) return [...schemaColumns];

  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const preferred = preferredColumns.filter((column) => keys.includes(column));
  const remaining = keys.filter((column) => !preferred.includes(column));
  return [...preferred, ...remaining].slice(0, maxColumns);
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

export function createWorkbenchStructuredDataSchemaEmptyRow({
  columns,
  getDefinition,
}: {
  columns: readonly string[];
  getDefinition: (column: string) => WorkbenchStructuredDataSchemaFieldDefinition | undefined;
}) {
  return columns.reduce<WorkbenchStructuredDataRecord>((row, column) => {
    row[column] = getWorkbenchStructuredDataSchemaFieldDefaultValue(getDefinition(column));
    return row;
  }, {});
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

export function getWorkbenchStructuredDataFormFields(
  sections: readonly WorkbenchStructuredDataFormSection[],
) {
  return sections.flatMap((section) => section.fields ?? []);
}

export function normalizeWorkbenchStructuredDataFormData(
  sections: readonly WorkbenchStructuredDataFormSection[],
  data: WorkbenchStructuredDataRecord = EMPTY_RECORD,
): WorkbenchStructuredDataRecord {
  return getWorkbenchStructuredDataFormFields(sections).reduce<WorkbenchStructuredDataRecord>(
    (nextData, field) => {
      const value = getWorkbenchStructuredDataValue(nextData, field.path);
      return setWorkbenchStructuredDataValue(
        nextData,
        field.path,
        value === undefined
          ? getWorkbenchStructuredDataFormFieldDefaultValue(field)
          : coerceWorkbenchStructuredDataFormFieldValue(field, value),
      );
    },
    { ...data },
  );
}

export function getWorkbenchStructuredDataFormFieldError({
  data,
  field,
  value,
}: {
  data: WorkbenchStructuredDataRecord;
  field: WorkbenchStructuredDataFormField;
  value: WorkbenchStructuredDataFieldValue;
}) {
  if (field.validationMessage) return field.validationMessage;
  if (field.required && isWorkbenchStructuredDataFormEmptyValue(value)) {
    return 'This field is required.';
  }

  return field.validate?.(value, data, field);
}

export function getWorkbenchStructuredDataFormErrors(
  sections: readonly WorkbenchStructuredDataFormSection[],
  data: WorkbenchStructuredDataRecord = EMPTY_RECORD,
): WorkbenchStructuredDataFormErrors {
  const normalizedData = normalizeWorkbenchStructuredDataFormData(sections, data);

  return getWorkbenchStructuredDataFormFields(sections).reduce<WorkbenchStructuredDataFormErrors>(
    (errors, field) => {
      const value = coerceWorkbenchStructuredDataFormFieldValue(
        field,
        getWorkbenchStructuredDataValue(normalizedData, field.path),
      );
      const error = getWorkbenchStructuredDataFormFieldError({
        data: normalizedData,
        field,
        value,
      });

      if (isRenderableWorkbenchStructuredDataFormError(error)) {
        errors[field.id] = error;
      }

      return errors;
    },
    {},
  );
}

export function isWorkbenchStructuredDataFormSubmittable({
  disabled = false,
  errors = {},
  readOnly = false,
}: {
  disabled?: boolean;
  errors?: WorkbenchStructuredDataFormErrors;
  readOnly?: boolean;
}) {
  return !disabled && !readOnly && Object.keys(errors).length === 0;
}

function isWorkbenchStructuredDataFormEmptyValue(value: WorkbenchStructuredDataFieldValue) {
  if (Array.isArray(value)) return value.length === 0;
  return value === '' || value === false;
}

function isRenderableWorkbenchStructuredDataFormError(error: ReactNode) {
  return error !== undefined && error !== null && error !== false && error !== '';
}
