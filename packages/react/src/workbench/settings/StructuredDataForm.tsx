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
import { Select } from '../../primitives/Select';
import { TextInput } from '../../primitives/TextInput';
import { cx } from '../../utils/cx';
import { WorkbenchSectionedPanel } from './SectionedPanel';

export type WorkbenchStructuredDataPath = readonly string[];

export type WorkbenchStructuredDataFieldType = 'checkbox' | 'number' | 'select' | 'text';

export type WorkbenchStructuredDataFieldValue = boolean | number | string;

export type WorkbenchStructuredDataRecord = Record<string, unknown>;

export type WorkbenchStructuredDataFormErrors = Record<string, ReactNode>;

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

export type WorkbenchStructuredDataFormField =
  | WorkbenchStructuredDataFormCheckboxField
  | WorkbenchStructuredDataFormNumberField
  | WorkbenchStructuredDataFormSelectField
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
  data: WorkbenchStructuredDataRecord,
  path: WorkbenchStructuredDataPath,
) {
  return path.reduce<unknown>((currentValue, segment) => {
    if (!isWorkbenchStructuredDataRecord(currentValue)) return undefined;
    return currentValue[segment];
  }, data);
}

export function setWorkbenchStructuredDataValue(
  data: WorkbenchStructuredDataRecord,
  path: WorkbenchStructuredDataPath,
  value: unknown,
): WorkbenchStructuredDataRecord {
  if (path.length === 0) return data;

  const [segment, ...rest] = path;
  const nextData = { ...data };

  if (rest.length === 0) {
    nextData[segment] = value;
    return nextData;
  }

  const currentChild = nextData[segment];
  const childRecord = isWorkbenchStructuredDataRecord(currentChild) ? currentChild : {};
  nextData[segment] = setWorkbenchStructuredDataValue(childRecord, rest, value);
  return nextData;
}

export function getWorkbenchStructuredDataFormFieldDefaultValue(
  field: WorkbenchStructuredDataFormField,
): WorkbenchStructuredDataFieldValue {
  if (field.defaultValue !== undefined) {
    return coerceWorkbenchStructuredDataFormFieldValue(field, field.defaultValue);
  }

  if (field.type === 'checkbox') return false;
  return '';
}

export function coerceWorkbenchStructuredDataFormFieldValue(
  field: WorkbenchStructuredDataFormField,
  value: unknown,
): WorkbenchStructuredDataFieldValue {
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'number') {
    if (value === '' || value === null || value === undefined) return '';
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : '';
  }

  return value === null || value === undefined ? '' : String(value);
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

function formatStructuredDataCell(value: unknown) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function isWorkbenchStructuredDataRecord(value: unknown): value is WorkbenchStructuredDataRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isWorkbenchStructuredDataFormEmptyValue(value: WorkbenchStructuredDataFieldValue) {
  return value === '' || value === false;
}

function isRenderableWorkbenchStructuredDataFormError(error: ReactNode) {
  return error !== undefined && error !== null && error !== false && error !== '';
}
