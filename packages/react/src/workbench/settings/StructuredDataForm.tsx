import {
  useId,
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Button } from '../../primitives/Button';
import { Checkbox } from '../../primitives/Checkbox';
import { EmptyState } from '../../primitives/EmptyState';
import { Field } from '../../primitives/Field';
import { IconButton } from '../../primitives/IconButton';
import { Select } from '../../primitives/Select';
import { TextArea } from '../../primitives/TextArea';
import { TextInput } from '../../primitives/TextInput';
import { cx } from '../../utils/cx';
import { WorkbenchSectionedPanel } from './SectionedPanel';

export type WorkbenchStructuredDataPath = readonly (number | string)[];

export type WorkbenchStructuredDataFieldType =
  | 'checkbox'
  | 'number'
  | 'select'
  | 'text'
  | 'text-array';

export type WorkbenchStructuredDataFieldValue = boolean | number | string | readonly string[];

export type WorkbenchStructuredDataRecord = Record<string, unknown>;

export type WorkbenchStructuredDataFormErrors = Record<string, ReactNode>;

export type WorkbenchStructuredDataSchemaFieldControl =
  | 'checkbox'
  | 'date'
  | 'number'
  | 'select'
  | 'text'
  | 'textarea';

export interface WorkbenchStructuredDataSchemaFieldDefinition {
  default?: unknown;
  description?: string | undefined;
  enum?: readonly (boolean | number | string)[] | undefined;
  format?: string | undefined;
  items?: {
    type?: string | undefined;
  };
  markdownDescription?: string | undefined;
  title?: string | undefined;
  type?: string | undefined;
  ui?: {
    control?: WorkbenchStructuredDataSchemaFieldControl | string | undefined;
    placeholder?: string | undefined;
    rows?: number | undefined;
  };
}

export interface WorkbenchStructuredDataSchemaSectionSummary {
  columns?: readonly string[] | undefined;
  dataPath?: string | undefined;
  fieldCount?: number | undefined;
  fields?: readonly string[] | undefined;
  id?: string | undefined;
  sectionKey?: string | undefined;
  title?: string | undefined;
  type?: string | undefined;
}

export interface WorkbenchStructuredDataSchemaTableDefinition {
  items?: Record<string, WorkbenchStructuredDataSchemaFieldDefinition> | undefined;
  title?: string | undefined;
}

export interface WorkbenchStructuredDataSchemaDocument {
  activePattern?: string | undefined;
  pattern?: string | undefined;
  patterns?: readonly {
    pattern: string;
    sections?: readonly WorkbenchStructuredDataSchemaSectionSummary[] | undefined;
  }[];
  sampleDraft?: unknown;
  sampleDrafts?: Record<string, unknown> | undefined;
  schema?: {
    properties?: Record<string, WorkbenchStructuredDataSchemaFieldDefinition> | undefined;
    sections?: readonly WorkbenchStructuredDataSchemaSectionSummary[] | undefined;
    tables?: Record<string, WorkbenchStructuredDataSchemaTableDefinition> | undefined;
  };
  ui?: {
    patterns?: Record<
      string,
      { label?: string | undefined; sections?: readonly WorkbenchStructuredDataSchemaSectionSummary[] | undefined }
    >;
  };
}

export type WorkbenchStructuredDataSchemaSectionAliases = Record<
  string,
  readonly WorkbenchStructuredDataPath[]
>;

export interface WorkbenchStructuredDataSchemaTableColumnInput {
  maxColumns?: number | undefined;
  preferredColumns?: readonly string[] | undefined;
  rows: readonly WorkbenchStructuredDataRecord[];
  schemaColumns?: readonly string[] | undefined;
  sectionColumns?: readonly string[] | undefined;
}

export interface WorkbenchStructuredDataSchemaTableRowKeyInput {
  row: WorkbenchStructuredDataRecord;
  rowIndex: number;
  value: unknown;
}

export interface WorkbenchStructuredDataFormOption {
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

export interface WorkbenchStructuredDataFormFieldBase {
  defaultValue?: WorkbenchStructuredDataFieldValue;
  description?: ReactNode;
  disabled?: boolean;
  id: string;
  label: ReactNode;
  metadata?: Record<string, unknown>;
  path: WorkbenchStructuredDataPath;
  readOnly?: boolean;
  required?: boolean;
  validationMessage?: ReactNode;
  validate?: (
    value: WorkbenchStructuredDataFieldValue,
    data: WorkbenchStructuredDataRecord,
    field: WorkbenchStructuredDataFormField,
  ) => ReactNode | undefined;
}

export interface WorkbenchStructuredDataFormTextField extends WorkbenchStructuredDataFormFieldBase {
  autocomplete?: string;
  monospace?: boolean;
  placeholder?: string;
  type: 'text';
}

export interface WorkbenchStructuredDataFormNumberField extends WorkbenchStructuredDataFormFieldBase {
  max?: number;
  min?: number;
  placeholder?: string;
  step?: number;
  type: 'number';
}

export interface WorkbenchStructuredDataFormSelectField extends WorkbenchStructuredDataFormFieldBase {
  emptyOptionLabel?: ReactNode;
  options: readonly WorkbenchStructuredDataFormOption[];
  type: 'select';
}

export interface WorkbenchStructuredDataFormCheckboxField extends WorkbenchStructuredDataFormFieldBase {
  type: 'checkbox';
}

export interface WorkbenchStructuredDataFormTextArrayField extends WorkbenchStructuredDataFormFieldBase {
  addLabel?: ReactNode;
  emptyLabel?: ReactNode;
  itemLabel?: string;
  itemPlaceholder?: string;
  maxItems?: number;
  minItems?: number;
  removeLabel?: string;
  type: 'text-array';
}

export interface WorkbenchStructuredDataTextArrayInputProps
  extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'onChange'> {
  addLabel?: ReactNode | undefined;
  ariaDescribedBy?: string | undefined;
  ariaLabel: string;
  disabled?: boolean | undefined;
  emptyLabel?: ReactNode | undefined;
  maxItems?: number | undefined;
  minItems?: number | undefined;
  placeholder?: string | undefined;
  readOnly?: boolean | undefined;
  removeLabel?: string | undefined;
  value?: unknown;
  onValueChange?: ((value: string[]) => void) | undefined;
}

export interface WorkbenchStructuredDataSchemaFieldInputProps {
  addTextArrayLabel?: ReactNode | undefined;
  checkboxClassName?: string | undefined;
  className?: string | undefined;
  definition?: WorkbenchStructuredDataSchemaFieldDefinition | undefined;
  fieldPath: string;
  readOnly?: boolean | undefined;
  removeTextArrayLabel?: string | undefined;
  textareaClassName?: string | undefined;
  textArrayClassName?: string | undefined;
  value: unknown;
  onValueChange?: ((value: unknown) => void) | undefined;
}

export type WorkbenchStructuredDataFormField =
  | WorkbenchStructuredDataFormCheckboxField
  | WorkbenchStructuredDataFormNumberField
  | WorkbenchStructuredDataFormSelectField
  | WorkbenchStructuredDataFormTextArrayField
  | WorkbenchStructuredDataFormTextField;

export interface WorkbenchStructuredDataTableColumn {
  align?: 'end' | 'start';
  id: string;
  label: ReactNode;
  path?: WorkbenchStructuredDataPath;
  render?: (context: WorkbenchStructuredDataTableCellContext) => ReactNode;
}

export interface WorkbenchStructuredDataTableRow {
  data: WorkbenchStructuredDataRecord;
  id: string;
  label?: ReactNode;
  metadata?: Record<string, unknown>;
}

export interface WorkbenchStructuredDataTableCellContext {
  column: WorkbenchStructuredDataTableColumn;
  row: WorkbenchStructuredDataTableRow;
  value: unknown;
}

export interface WorkbenchStructuredDataTable {
  columns: readonly WorkbenchStructuredDataTableColumn[];
  description?: ReactNode;
  emptyLabel?: ReactNode;
  id: string;
  label?: ReactNode;
  rows: readonly WorkbenchStructuredDataTableRow[];
}

export interface WorkbenchStructuredDataFormSection {
  count?: number;
  description?: ReactNode;
  fields?: readonly WorkbenchStructuredDataFormField[];
  id: string;
  tables?: readonly WorkbenchStructuredDataTable[];
  title: ReactNode;
}

export interface WorkbenchStructuredDataFormFieldChangeContext {
  data: WorkbenchStructuredDataRecord;
  field: WorkbenchStructuredDataFormField;
  fieldId: string;
  path: WorkbenchStructuredDataPath;
  value: WorkbenchStructuredDataFieldValue;
}

export interface WorkbenchStructuredDataFormSubmitContext {
  data: WorkbenchStructuredDataRecord;
  event: FormEvent<HTMLFormElement>;
}

export interface WorkbenchStructuredDataFormCancelContext {
  data: WorkbenchStructuredDataRecord;
}

export interface WorkbenchStructuredDataFormProps extends Omit<
  ComponentPropsWithRef<'form'>,
  'children' | 'defaultValue' | 'onCancel' | 'onChange' | 'onSubmit'
> {
  ariaLabel: string;
  cancelLabel?: ReactNode;
  data?: WorkbenchStructuredDataRecord;
  defaultData?: WorkbenchStructuredDataRecord;
  disabled?: boolean;
  emptyLabel?: ReactNode;
  errors?: WorkbenchStructuredDataFormErrors;
  onCancel?: (context: WorkbenchStructuredDataFormCancelContext) => void;
  onDataChange?: (
    data: WorkbenchStructuredDataRecord,
    context: WorkbenchStructuredDataFormFieldChangeContext,
  ) => void;
  onFieldChange?: (context: WorkbenchStructuredDataFormFieldChangeContext) => void;
  onSubmit?: (
    data: WorkbenchStructuredDataRecord,
    context: WorkbenchStructuredDataFormSubmitContext,
  ) => void;
  readOnly?: boolean;
  sections: readonly WorkbenchStructuredDataFormSection[];
  showActions?: boolean;
  submitLabel?: ReactNode;
}

const EMPTY_RECORD: WorkbenchStructuredDataRecord = {};

export function getWorkbenchStructuredDataValue(
  data: unknown,
  path: WorkbenchStructuredDataPath,
) {
  return path.reduce<unknown>((currentValue, segment) => {
    if (Array.isArray(currentValue)) {
      const index = getWorkbenchStructuredDataArrayIndex(segment);
      return index === null ? undefined : currentValue[index];
    }
    if (!isWorkbenchStructuredDataRecord(currentValue)) return undefined;
    return currentValue[String(segment)];
  }, data);
}

export function setWorkbenchStructuredDataValue(
  data: WorkbenchStructuredDataRecord,
  path: WorkbenchStructuredDataPath,
  value: unknown,
): WorkbenchStructuredDataRecord {
  if (path.length === 0) return data;

  const nextValue = setWorkbenchStructuredDataPathValue(data, path, value);
  return isWorkbenchStructuredDataRecord(nextValue) ? nextValue : {};
}

export function setWorkbenchStructuredDataPathOrRootValue({
  data,
  path,
  value,
}: {
  data: unknown;
  path: WorkbenchStructuredDataPath;
  value: unknown;
}) {
  if (path.length === 0) return value;
  return setWorkbenchStructuredDataValue(asWorkbenchStructuredDataRecord(data) ?? {}, path, value);
}

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

export function getWorkbenchStructuredDataSchemaFieldControl(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): WorkbenchStructuredDataSchemaFieldControl {
  if (definition?.ui?.control) {
    return definition.ui.control as WorkbenchStructuredDataSchemaFieldControl;
  }
  if (definition?.enum?.length) return 'select';
  if (definition?.type === 'array') return 'textarea';
  if (definition?.type === 'boolean') return 'checkbox';
  if (definition?.type === 'number' || definition?.type === 'integer') return 'number';
  if (definition?.format === 'date') return 'date';
  return 'text';
}

export function getWorkbenchStructuredDataSchemaFieldDefaultValue(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
) {
  if (definition?.default !== undefined) return definition.default;
  if (definition?.type === 'array') return [];
  if (definition?.type === 'boolean') return false;
  if (definition?.type === 'number' || definition?.type === 'integer') return 0;
  return '';
}

export function stringifyWorkbenchStructuredDataSchemaFieldValue(
  value: unknown,
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
) {
  if (Array.isArray(value)) return value.join('\n');
  if (value === null || value === undefined) return '';
  if (definition?.type === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function booleanWorkbenchStructuredDataSchemaFieldValue(value: unknown) {
  return value === true || value === 'true' || value === 'Y';
}

export function coerceWorkbenchStructuredDataSchemaFieldValue(
  rawValue: string,
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): unknown {
  if (definition?.type === 'array') {
    return rawValue.split('\n');
  }

  if (definition?.type === 'number' || definition?.type === 'integer') {
    if (rawValue.trim() === '') return null;
    const numericValue = Number(rawValue);
    return Number.isFinite(numericValue) ? numericValue : rawValue;
  }

  if (definition?.enum?.length) {
    return definition.enum.find((option) => String(option) === rawValue) ?? rawValue;
  }

  return rawValue;
}

export function formatWorkbenchStructuredDataSchemaValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.join('\n');
  if (typeof value === 'boolean') return value ? 'Y' : 'N';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function asWorkbenchStructuredDataRecord(
  value: unknown,
): WorkbenchStructuredDataRecord | null {
  return isWorkbenchStructuredDataRecord(value) ? value : null;
}

export function getWorkbenchStructuredDataSchemaSectionId(
  section: WorkbenchStructuredDataSchemaSectionSummary,
) {
  return section.id ?? section.sectionKey;
}

export function getWorkbenchStructuredDataSchemaSectionPath(
  section: WorkbenchStructuredDataSchemaSectionSummary,
) {
  return section.dataPath?.trim() || section.sectionKey || section.id || '';
}

export function formatWorkbenchStructuredDataSchemaLabel(value: string) {
  return value.replace(/_/g, ' ');
}

export function getWorkbenchStructuredDataSchemaFieldDataPath(
  section: WorkbenchStructuredDataSchemaSectionSummary,
  fieldPath: string,
) {
  if (fieldPath.includes('.')) return fieldPath;
  const sectionPath = getWorkbenchStructuredDataSchemaSectionPath(section);
  return sectionPath ? `${sectionPath}.${fieldPath}` : fieldPath;
}

export function getWorkbenchStructuredDataSchemaFieldDefinition({
  fieldPath,
  properties,
  section,
}: {
  fieldPath: string;
  properties?: Record<string, WorkbenchStructuredDataSchemaFieldDefinition> | undefined;
  section: WorkbenchStructuredDataSchemaSectionSummary;
}) {
  const sectionPath = getWorkbenchStructuredDataSchemaSectionPath(section);
  return (
    properties?.[fieldPath] ??
    (sectionPath ? properties?.[`${sectionPath}.${fieldPath}`] : undefined)
  );
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
    formatWorkbenchStructuredDataSchemaLabel(fieldPath.split('.').pop() ?? fieldPath)
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
  getDefinition: (
    column: string,
  ) => WorkbenchStructuredDataSchemaFieldDefinition | undefined;
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
      const columns = section.columns?.length ? section.columns : Object.keys(schemaTable?.items ?? {});

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

export function slugWorkbenchStructuredDataSchemaAnchor(value: string | undefined) {
  return (
    value
      ?.toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

export function getWorkbenchStructuredDataSchemaSectionAnchorId({
  index,
  panelId,
  section,
}: {
  index: number;
  panelId: string;
  section: WorkbenchStructuredDataSchemaSectionSummary;
}) {
  return `${panelId}-section-${index}-${slugWorkbenchStructuredDataSchemaAnchor(
    getWorkbenchStructuredDataSchemaSectionId(section) ?? section.title,
  )}`;
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

export function WorkbenchStructuredDataForm({
  ariaLabel,
  cancelLabel = 'Cancel',
  className,
  data,
  defaultData = {},
  disabled = false,
  emptyLabel = 'No structured data sections',
  errors,
  onCancel,
  onDataChange,
  onFieldChange,
  onSubmit,
  readOnly = false,
  sections,
  showActions = true,
  submitLabel = 'Save',
  ...props
}: WorkbenchStructuredDataFormProps) {
  const generatedId = useId().replace(/:/g, '');
  const [uncontrolledData, setUncontrolledData] = useState(() =>
    normalizeWorkbenchStructuredDataFormData(sections, defaultData),
  );
  const resolvedData = useMemo(
    () => normalizeWorkbenchStructuredDataFormData(sections, data ?? uncontrolledData),
    [data, sections, uncontrolledData],
  );
  const resolvedErrors = useMemo(
    () => ({
      ...getWorkbenchStructuredDataFormErrors(sections, resolvedData),
      ...(errors ?? {}),
    }),
    [errors, resolvedData, sections],
  );
  const submittable = isWorkbenchStructuredDataFormSubmittable({
    disabled,
    errors: resolvedErrors,
    readOnly,
  });

  const updateFieldValue = (
    field: WorkbenchStructuredDataFormField,
    value: WorkbenchStructuredDataFieldValue,
  ) => {
    const coercedValue = coerceWorkbenchStructuredDataFormFieldValue(field, value);
    const nextData = setWorkbenchStructuredDataValue(resolvedData, field.path, coercedValue);
    const context: WorkbenchStructuredDataFormFieldChangeContext = {
      data: nextData,
      field,
      fieldId: field.id,
      path: field.path,
      value: coercedValue,
    };

    if (data === undefined) {
      setUncontrolledData(nextData);
    }

    onFieldChange?.(context);
    onDataChange?.(nextData, context);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submittable) return;

    onSubmit?.(resolvedData, { data: resolvedData, event });
  };

  return (
    <form
      className={cx('ui-workbench-structured-data-form', className)}
      data-readonly={readOnly ? 'true' : undefined}
      onSubmit={handleSubmit}
      {...props}
    >
      {sections.length === 0 ? (
        <EmptyState compact icon="codicon-settings-gear">
          {emptyLabel}
        </EmptyState>
      ) : (
        <WorkbenchSectionedPanel
          ariaLabel={ariaLabel}
          className="ui-workbench-structured-data-form__panel"
          items={sections.map((section) => ({
            anchorId: section.id,
            count: section.count ?? section.fields?.length,
            title: section.title,
            render: () => (
              <StructuredDataSection
                key={section.id}
                data={resolvedData}
                disabled={disabled}
                errors={resolvedErrors}
                generatedId={generatedId}
                readOnly={readOnly}
                section={section}
                onFieldChange={updateFieldValue}
              />
            ),
          }))}
          readOnly={readOnly}
        />
      )}
      {showActions ? (
        <div className="ui-workbench-structured-data-form__actions">
          <Button disabled={disabled} onClick={() => onCancel?.({ data: resolvedData })}>
            {cancelLabel}
          </Button>
          <Button disabled={!submittable} type="submit" variant="primary">
            {submitLabel}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

function StructuredDataSection({
  data,
  disabled,
  errors,
  generatedId,
  onFieldChange,
  readOnly,
  section,
}: {
  data: WorkbenchStructuredDataRecord;
  disabled: boolean;
  errors: WorkbenchStructuredDataFormErrors;
  generatedId: string;
  onFieldChange: (
    field: WorkbenchStructuredDataFormField,
    value: WorkbenchStructuredDataFieldValue,
  ) => void;
  readOnly: boolean;
  section: WorkbenchStructuredDataFormSection;
}) {
  return (
    <section
      id={section.id}
      className="ui-workbench-structured-data-form__section"
      aria-labelledby={`${generatedId}-${section.id}-title`}
    >
      <h2 id={`${generatedId}-${section.id}-title`}>{section.title}</h2>
      {section.description ? <p>{section.description}</p> : null}
      {section.fields?.length ? (
        <div className="ui-workbench-structured-data-form__fields">
          {section.fields.map((field) => {
            const fieldInputId = `${generatedId}-${field.id}`;
            const error = errors[field.id];
            const errorId = isRenderableWorkbenchStructuredDataFormError(error)
              ? `${fieldInputId}-error`
              : undefined;
            const value = coerceWorkbenchStructuredDataFormFieldValue(
              field,
              getWorkbenchStructuredDataValue(data, field.path),
            );

            return (
              <div
                key={field.id}
                className="ui-workbench-structured-data-form__field"
                data-field-id={field.id}
                data-field-type={field.type}
              >
                {renderStructuredDataField({
                  disabled: disabled || Boolean(field.disabled),
                  errorId,
                  field,
                  id: fieldInputId,
                  readOnly: readOnly || Boolean(field.readOnly),
                  value,
                  onChange: (nextValue) => onFieldChange(field, nextValue),
                })}
                {isRenderableWorkbenchStructuredDataFormError(error) ? (
                  <div
                    id={errorId}
                    className="ui-workbench-structured-data-form__error"
                    role="alert"
                  >
                    {error}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {section.tables?.map((table) => (
        <StructuredDataTable key={table.id} table={table} />
      ))}
    </section>
  );
}

function StructuredDataTable({ table }: { table: WorkbenchStructuredDataTable }) {
  return (
    <section className="ui-workbench-structured-data-form__table-section">
      {table.label ? <h3>{table.label}</h3> : null}
      {table.description ? <p>{table.description}</p> : null}
      {table.rows.length === 0 ? (
        <EmptyState compact icon="codicon-table">
          {table.emptyLabel ?? 'No rows'}
        </EmptyState>
      ) : (
        <div className="ui-workbench-structured-data-form__table-scroll">
          <table className="ui-workbench-structured-data-form__table">
            <thead>
              <tr>
                {table.columns.map((column) => (
                  <th key={column.id} data-align={column.align}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.id}>
                  {table.columns.map((column) => {
                    const value = column.path
                      ? getWorkbenchStructuredDataValue(row.data, column.path)
                      : undefined;

                    return (
                      <td key={column.id} data-align={column.align}>
                        {column.render?.({ column, row, value }) ?? formatStructuredDataCell(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function renderStructuredDataField({
  disabled,
  errorId,
  field,
  id,
  onChange,
  readOnly,
  value,
}: {
  disabled: boolean;
  errorId?: string;
  field: WorkbenchStructuredDataFormField;
  id: string;
  onChange: (value: WorkbenchStructuredDataFieldValue) => void;
  readOnly: boolean;
  value: WorkbenchStructuredDataFieldValue;
}) {
  if (field.type === 'checkbox') {
    return (
      <Field description={field.description}>
        <Checkbox
          aria-describedby={errorId}
          checked={Boolean(value)}
          disabled={disabled || readOnly}
          label={field.label}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
      </Field>
    );
  }

  if (field.type === 'select') {
    return (
      <Field description={field.description} htmlFor={id} label={field.label}>
        <Select
          id={id}
          aria-describedby={errorId}
          controlWidth="full"
          disabled={disabled || readOnly}
          value={String(value)}
          onChange={(event) => onChange(event.currentTarget.value)}
        >
          {field.emptyOptionLabel ? <option value="">{field.emptyOptionLabel}</option> : null}
          {field.options.map((option) => (
            <option key={option.value} disabled={option.disabled} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (field.type === 'text-array') {
    const itemLabel = field.itemLabel ?? getStructuredDataLabelText(field.label, 'Item');

    return (
      <Field
        className="ui-workbench-structured-data-form__array-field"
        description={field.description}
        label={field.label}
      >
        <WorkbenchStructuredDataTextArrayInput
          addLabel={field.addLabel}
          ariaDescribedBy={errorId}
          ariaLabel={itemLabel}
          disabled={disabled}
          emptyLabel={field.emptyLabel}
          maxItems={field.maxItems}
          minItems={field.minItems}
          placeholder={field.itemPlaceholder}
          readOnly={readOnly}
          removeLabel={field.removeLabel}
          value={value}
          onValueChange={onChange}
        />
      </Field>
    );
  }

  return (
    <Field description={field.description} htmlFor={id} label={field.label}>
      <TextInput
        id={id}
        aria-describedby={errorId}
        autoComplete={field.type === 'text' ? field.autocomplete : undefined}
        controlWidth="full"
        disabled={disabled}
        max={field.type === 'number' ? field.max : undefined}
        min={field.type === 'number' ? field.min : undefined}
        monospace={field.type === 'text' ? field.monospace : false}
        placeholder={field.placeholder}
        readOnly={readOnly}
        step={field.type === 'number' ? field.step : undefined}
        type={field.type}
        value={String(value)}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </Field>
  );
}

function structuredDataTextArrayItems(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => (item === null || item === undefined ? '' : String(item)));
  }
  if (value === '' || value === null || value === undefined) return [];
  return [String(value)];
}

export function WorkbenchStructuredDataSchemaFieldInput({
  addTextArrayLabel,
  checkboxClassName,
  className,
  definition,
  fieldPath,
  onValueChange,
  readOnly = false,
  removeTextArrayLabel,
  textareaClassName,
  textArrayClassName,
  value,
}: WorkbenchStructuredDataSchemaFieldInputProps) {
  const control = getWorkbenchStructuredDataSchemaFieldControl(definition);
  const label = definition?.title ?? formatWorkbenchStructuredDataSchemaLabel(fieldPath);
  const stringValue = stringifyWorkbenchStructuredDataSchemaFieldValue(value, definition);

  if (definition?.type === 'array' && definition.items?.type === 'string') {
    return (
      <WorkbenchStructuredDataTextArrayInput
        addLabel={addTextArrayLabel}
        ariaLabel={label}
        className={cx(className, textArrayClassName)}
        placeholder={definition.ui?.placeholder}
        readOnly={readOnly}
        removeLabel={removeTextArrayLabel}
        value={value}
        onValueChange={onValueChange}
      />
    );
  }

  if (control === 'select') {
    return (
      <Select
        aria-label={label}
        className={className}
        controlWidth="full"
        disabled={readOnly}
        value={stringValue}
        onChange={(event) =>
          onValueChange?.(
            coerceWorkbenchStructuredDataSchemaFieldValue(event.currentTarget.value, definition),
          )
        }
      >
        {(definition?.enum ?? []).map((option) => (
          <option key={String(option)} value={String(option)}>
            {String(option)}
          </option>
        ))}
      </Select>
    );
  }

  if (control === 'textarea') {
    return (
      <TextArea
        aria-label={label}
        className={cx(className, textareaClassName)}
        controlWidth="full"
        monospace={definition?.type === 'array' || definition?.type === 'object'}
        placeholder={definition?.ui?.placeholder}
        readOnly={readOnly}
        resize="vertical"
        rows={definition?.ui?.rows ?? (definition?.type === 'array' ? 3 : 4)}
        value={stringValue}
        onChange={(event) => {
          if (!readOnly) {
            onValueChange?.(
              coerceWorkbenchStructuredDataSchemaFieldValue(event.currentTarget.value, definition),
            );
          }
        }}
      />
    );
  }

  if (control === 'checkbox') {
    return (
      <Checkbox
        checked={booleanWorkbenchStructuredDataSchemaFieldValue(value)}
        className={checkboxClassName}
        disabled={readOnly}
        label={booleanWorkbenchStructuredDataSchemaFieldValue(value) ? 'Enabled' : 'Disabled'}
        onChange={(event) => onValueChange?.(event.currentTarget.checked)}
      />
    );
  }

  return (
    <TextInput
      aria-label={label}
      className={className}
      controlWidth="full"
      placeholder={definition?.ui?.placeholder}
      readOnly={readOnly}
      type={control === 'date' || control === 'number' ? control : 'text'}
      value={stringValue}
      onChange={(event) => {
        if (!readOnly) {
          onValueChange?.(
            coerceWorkbenchStructuredDataSchemaFieldValue(event.currentTarget.value, definition),
          );
        }
      }}
    />
  );
}

export function WorkbenchStructuredDataTextArrayInput({
  addLabel = 'Add item',
  ariaDescribedBy,
  ariaLabel,
  className,
  disabled = false,
  emptyLabel,
  maxItems,
  minItems,
  placeholder,
  readOnly = false,
  removeLabel = 'Remove',
  value,
  onValueChange,
  ...props
}: WorkbenchStructuredDataTextArrayInputProps) {
  const generatedId = useId();
  const items = structuredDataTextArrayItems(value);
  const canEdit = !disabled && !readOnly;
  const addDisabled = !canEdit || (maxItems !== undefined && items.length >= maxItems);
  const removeDisabled = !canEdit || (minItems !== undefined && items.length <= minItems);

  const updateItem = (index: number, nextValue: string) => {
    onValueChange?.(items.map((item, itemIndex) => (itemIndex === index ? nextValue : item)));
  };

  const removeItem = (index: number) => {
    onValueChange?.(items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className={cx('ui-workbench-structured-data-form__array', className)} {...props}>
      {items.length === 0 && emptyLabel ? (
        <div className="ui-workbench-structured-data-form__array-empty">{emptyLabel}</div>
      ) : null}
      {items.map((item, index) => {
        const itemNumber = index + 1;
        const itemInputId = `${generatedId}-${itemNumber}`;

        return (
          <div className="ui-workbench-structured-data-form__array-row" key={itemInputId}>
            <TextInput
              id={itemInputId}
              aria-describedby={ariaDescribedBy}
              aria-label={`${ariaLabel} ${itemNumber}`}
              controlWidth="full"
              disabled={disabled}
              placeholder={placeholder}
              readOnly={readOnly}
              value={item}
              onChange={(event) => updateItem(index, event.currentTarget.value)}
            />
            <IconButton
              compact
              disabled={removeDisabled}
              icon="codicon-trash"
              label={`${removeLabel} ${ariaLabel} ${itemNumber}`}
              onClick={() => removeItem(index)}
            />
          </div>
        );
      })}
      <Button
        compact
        disabled={addDisabled}
        icon="codicon-add"
        onClick={() => onValueChange?.([...items, ''])}
      >
        {addLabel}
      </Button>
    </div>
  );
}

function formatStructuredDataCell(value: unknown) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length === 0 ? '-' : value.join(', ');
  return String(value);
}

function isWorkbenchStructuredDataRecord(value: unknown): value is WorkbenchStructuredDataRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getWorkbenchStructuredDataArrayIndex(segment: number | string) {
  const index = typeof segment === 'number' ? segment : Number(segment);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function createWorkbenchStructuredDataContainer(segment: number | string | undefined) {
  return segment !== undefined && getWorkbenchStructuredDataArrayIndex(segment) !== null ? [] : {};
}

function cloneWorkbenchStructuredDataContainer(
  value: unknown,
  nextSegment: number | string | undefined,
): Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) return [...value];
  if (isWorkbenchStructuredDataRecord(value)) return { ...value };
  return createWorkbenchStructuredDataContainer(nextSegment);
}

function setWorkbenchStructuredDataPathValue(
  data: unknown,
  path: WorkbenchStructuredDataPath,
  value: unknown,
): unknown {
  if (path.length === 0) return value;

  const [segment, ...rest] = path;
  const root = cloneWorkbenchStructuredDataContainer(data, segment);
  const key = Array.isArray(root) ? getWorkbenchStructuredDataArrayIndex(segment) : String(segment);
  if (key === null) return root;

  if (rest.length === 0) {
    root[key as keyof typeof root] = value as never;
    return root;
  }

  const currentChild = root[key as keyof typeof root];
  root[key as keyof typeof root] = setWorkbenchStructuredDataPathValue(
    currentChild,
    rest,
    value,
  ) as never;
  return root;
}

function isWorkbenchStructuredDataFormEmptyValue(value: WorkbenchStructuredDataFieldValue) {
  if (Array.isArray(value)) return value.length === 0;
  return value === '' || value === false;
}

function isRenderableWorkbenchStructuredDataFormError(error: ReactNode) {
  return error !== undefined && error !== null && error !== false && error !== '';
}

function getStructuredDataLabelText(label: ReactNode, fallback: string) {
  if (typeof label === 'string' || typeof label === 'number') return String(label);
  return fallback;
}
