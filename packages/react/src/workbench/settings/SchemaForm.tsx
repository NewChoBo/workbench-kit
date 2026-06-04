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

export type WorkbenchSchemaFormFieldType = 'checkbox' | 'number' | 'select' | 'text';

export type WorkbenchSchemaFormFieldValue = boolean | number | string;

export type WorkbenchSchemaFormValues = Record<string, WorkbenchSchemaFormFieldValue>;

export interface WorkbenchSchemaFormOption {
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

export interface WorkbenchSchemaFormFieldBase {
  defaultValue?: WorkbenchSchemaFormFieldValue;
  description?: ReactNode;
  disabled?: boolean;
  id: string;
  label: ReactNode;
  metadata?: Record<string, unknown>;
  readOnly?: boolean;
  required?: boolean;
  validationMessage?: ReactNode;
  validate?: (
    value: WorkbenchSchemaFormFieldValue,
    values: WorkbenchSchemaFormValues,
    field: WorkbenchSchemaFormField,
  ) => ReactNode | undefined;
}

export interface WorkbenchSchemaFormTextField extends WorkbenchSchemaFormFieldBase {
  autocomplete?: string;
  monospace?: boolean;
  placeholder?: string;
  type: 'text';
}

export interface WorkbenchSchemaFormNumberField extends WorkbenchSchemaFormFieldBase {
  max?: number;
  min?: number;
  placeholder?: string;
  step?: number;
  type: 'number';
}

export interface WorkbenchSchemaFormSelectField extends WorkbenchSchemaFormFieldBase {
  emptyOptionLabel?: ReactNode;
  options: readonly WorkbenchSchemaFormOption[];
  type: 'select';
}

export interface WorkbenchSchemaFormCheckboxField extends WorkbenchSchemaFormFieldBase {
  type: 'checkbox';
}

export type WorkbenchSchemaFormField =
  | WorkbenchSchemaFormCheckboxField
  | WorkbenchSchemaFormNumberField
  | WorkbenchSchemaFormSelectField
  | WorkbenchSchemaFormTextField;

export type WorkbenchSchemaFormErrors = Record<string, ReactNode>;

export interface WorkbenchSchemaFormFieldChangeContext {
  field: WorkbenchSchemaFormField;
  fieldId: string;
  value: WorkbenchSchemaFormFieldValue;
  values: WorkbenchSchemaFormValues;
}

export interface WorkbenchSchemaFormSubmitContext {
  event: FormEvent<HTMLFormElement>;
  values: WorkbenchSchemaFormValues;
}

export interface WorkbenchSchemaFormCancelContext {
  values: WorkbenchSchemaFormValues;
}

export interface WorkbenchSchemaFormProps extends Omit<
  ComponentPropsWithRef<'form'>,
  'children' | 'defaultValue' | 'onCancel' | 'onChange' | 'onSubmit'
> {
  cancelLabel?: ReactNode;
  defaultValues?: WorkbenchSchemaFormValues;
  disabled?: boolean;
  emptyLabel?: ReactNode;
  errors?: WorkbenchSchemaFormErrors;
  fields: readonly WorkbenchSchemaFormField[];
  onCancel?: (context: WorkbenchSchemaFormCancelContext) => void;
  onFieldChange?: (context: WorkbenchSchemaFormFieldChangeContext) => void;
  onSubmit?: (values: WorkbenchSchemaFormValues, context: WorkbenchSchemaFormSubmitContext) => void;
  onValuesChange?: (
    values: WorkbenchSchemaFormValues,
    context: WorkbenchSchemaFormFieldChangeContext,
  ) => void;
  readOnly?: boolean;
  showActions?: boolean;
  submitLabel?: ReactNode;
  values?: WorkbenchSchemaFormValues;
}

export function getWorkbenchSchemaFormFieldDefaultValue(
  field: WorkbenchSchemaFormField,
): WorkbenchSchemaFormFieldValue {
  if (field.defaultValue !== undefined) {
    return coerceWorkbenchSchemaFormFieldValue(field, field.defaultValue);
  }

  if (field.type === 'checkbox') return false;
  return '';
}

export function coerceWorkbenchSchemaFormFieldValue(
  field: WorkbenchSchemaFormField,
  value: unknown,
): WorkbenchSchemaFormFieldValue {
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'number') {
    if (value === '' || value === null || value === undefined) return '';
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : '';
  }

  return value === null || value === undefined ? '' : String(value);
}

export function normalizeWorkbenchSchemaFormValues(
  fields: readonly WorkbenchSchemaFormField[],
  values: Partial<WorkbenchSchemaFormValues> = {},
): WorkbenchSchemaFormValues {
  return fields.reduce<WorkbenchSchemaFormValues>((normalizedValues, field) => {
    const value =
      values[field.id] === undefined
        ? getWorkbenchSchemaFormFieldDefaultValue(field)
        : values[field.id];

    normalizedValues[field.id] = coerceWorkbenchSchemaFormFieldValue(field, value);
    return normalizedValues;
  }, {});
}

export function getWorkbenchSchemaFormFieldError({
  field,
  value,
  values,
}: {
  field: WorkbenchSchemaFormField;
  value: WorkbenchSchemaFormFieldValue;
  values: WorkbenchSchemaFormValues;
}) {
  if (field.validationMessage) return field.validationMessage;
  if (field.required && isWorkbenchSchemaFormEmptyValue(value)) {
    return 'This field is required.';
  }

  return field.validate?.(value, values, field);
}

export function getWorkbenchSchemaFormErrors(
  fields: readonly WorkbenchSchemaFormField[],
  values: Partial<WorkbenchSchemaFormValues> = {},
): WorkbenchSchemaFormErrors {
  const normalizedValues = normalizeWorkbenchSchemaFormValues(fields, values);

  return fields.reduce<WorkbenchSchemaFormErrors>((errors, field) => {
    const error = getWorkbenchSchemaFormFieldError({
      field,
      value: normalizedValues[field.id],
      values: normalizedValues,
    });

    if (isRenderableWorkbenchSchemaFormError(error)) {
      errors[field.id] = error;
    }

    return errors;
  }, {});
}

export function isWorkbenchSchemaFormSubmittable({
  disabled = false,
  errors = {},
  readOnly = false,
}: {
  disabled?: boolean;
  errors?: WorkbenchSchemaFormErrors;
  readOnly?: boolean;
}) {
  return !disabled && !readOnly && Object.keys(errors).length === 0;
}

function isWorkbenchSchemaFormEmptyValue(value: WorkbenchSchemaFormFieldValue) {
  return value === '' || value === false;
}

function isRenderableWorkbenchSchemaFormError(error: ReactNode) {
  return error !== undefined && error !== null && error !== false && error !== '';
}

export function WorkbenchSchemaForm({
  cancelLabel = 'Cancel',
  className,
  defaultValues = {},
  disabled = false,
  emptyLabel = 'No settings fields',
  errors,
  fields,
  onCancel,
  onFieldChange,
  onSubmit,
  onValuesChange,
  readOnly = false,
  showActions = true,
  submitLabel = 'Save',
  values,
  ...props
}: WorkbenchSchemaFormProps) {
  const generatedId = useId().replace(/:/g, '');
  const [uncontrolledValues, setUncontrolledValues] = useState(() =>
    normalizeWorkbenchSchemaFormValues(fields, defaultValues),
  );
  const resolvedValues = useMemo(
    () => normalizeWorkbenchSchemaFormValues(fields, values ?? uncontrolledValues),
    [fields, uncontrolledValues, values],
  );
  const resolvedErrors = useMemo(
    () => ({
      ...getWorkbenchSchemaFormErrors(fields, resolvedValues),
      ...(errors ?? {}),
    }),
    [errors, fields, resolvedValues],
  );
  const submittable = isWorkbenchSchemaFormSubmittable({
    disabled,
    errors: resolvedErrors,
    readOnly,
  });

  const updateFieldValue = (
    field: WorkbenchSchemaFormField,
    value: WorkbenchSchemaFormFieldValue,
  ) => {
    const nextValues = {
      ...resolvedValues,
      [field.id]: coerceWorkbenchSchemaFormFieldValue(field, value),
    };
    const context: WorkbenchSchemaFormFieldChangeContext = {
      field,
      fieldId: field.id,
      value: nextValues[field.id],
      values: nextValues,
    };

    if (values === undefined) {
      setUncontrolledValues(nextValues);
    }

    onFieldChange?.(context);
    onValuesChange?.(nextValues, context);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submittable) return;

    onSubmit?.(resolvedValues, { event, values: resolvedValues });
  };

  return (
    <form
      className={cx('ui-workbench-schema-form', className)}
      data-readonly={readOnly ? 'true' : undefined}
      onSubmit={handleSubmit}
      {...props}
    >
      {fields.length === 0 ? (
        <EmptyState compact icon="codicon-settings-gear">
          {emptyLabel}
        </EmptyState>
      ) : (
        <div className="ui-workbench-schema-form__fields">
          {fields.map((field) => {
            const fieldInputId = `${generatedId}-${field.id}`;
            const error = resolvedErrors[field.id];
            const errorId = isRenderableWorkbenchSchemaFormError(error)
              ? `${fieldInputId}-error`
              : undefined;
            const fieldDisabled = disabled || Boolean(field.disabled);
            const fieldReadOnly = readOnly || Boolean(field.readOnly);

            return (
              <div
                key={field.id}
                className="ui-workbench-schema-form__field"
                data-field-id={field.id}
                data-field-type={field.type}
              >
                {renderWorkbenchSchemaFormField({
                  disabled: fieldDisabled,
                  errorId,
                  field,
                  id: fieldInputId,
                  readOnly: fieldReadOnly,
                  value: resolvedValues[field.id],
                  onChange: (value) => updateFieldValue(field, value),
                })}
                {isRenderableWorkbenchSchemaFormError(error) ? (
                  <div id={errorId} className="ui-workbench-schema-form__error" role="alert">
                    {error}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {showActions ? (
        <div className="ui-workbench-schema-form__actions">
          <Button disabled={disabled} onClick={() => onCancel?.({ values: resolvedValues })}>
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

function renderWorkbenchSchemaFormField({
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
  field: WorkbenchSchemaFormField;
  id: string;
  onChange: (value: WorkbenchSchemaFormFieldValue) => void;
  readOnly: boolean;
  value: WorkbenchSchemaFormFieldValue;
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
        max={field.type === 'number' ? field.max : undefined}
        min={field.type === 'number' ? field.min : undefined}
        monospace={field.type === 'text' ? field.monospace : false}
        placeholder={field.placeholder}
        readOnly={readOnly}
        step={field.type === 'number' ? field.step : undefined}
        type={field.type}
        value={String(value)}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </Field>
  );
}
