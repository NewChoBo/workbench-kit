import type { ComponentPropsWithRef, FormEvent, ReactNode } from 'react';
import type {
  WorkbenchStructuredDataPath,
  WorkbenchStructuredDataRecord,
} from '@workbench-kit/workspace';

export type { WorkbenchStructuredDataPath, WorkbenchStructuredDataRecord };

export type WorkbenchStructuredDataFieldType =
  | 'checkbox'
  | 'number'
  | 'select'
  | 'text'
  | 'text-array';

export type WorkbenchStructuredDataFieldValue = boolean | number | string | readonly string[];

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
      {
        label?: string | undefined;
        sections?: readonly WorkbenchStructuredDataSchemaSectionSummary[] | undefined;
      }
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

export interface WorkbenchStructuredDataTextArrayInputProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onChange'
> {
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
