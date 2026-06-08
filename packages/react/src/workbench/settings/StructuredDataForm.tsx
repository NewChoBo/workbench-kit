export * from './structuredDataSchema';

import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../../primitives/Button';
import { Checkbox } from '../../primitives/Checkbox';
import { EmptyState } from '../../primitives/EmptyState';
import { WorkbenchStructuredDataTableView } from './StructuredDataTableView';
import { Field } from '../../primitives/Field';
import { IconButton } from '../../primitives/IconButton';
import { Select } from '../../primitives/Select';
import { TextArea } from '../../primitives/TextArea';
import { TextInput } from '../../primitives/TextInput';
import { cx } from '../../utils/cx';
import { WorkbenchSectionedPanel } from './SectionedPanel';
import {
  coerceWorkbenchStructuredDataFormFieldValue,
  coerceWorkbenchStructuredDataSchemaFieldValue,
  booleanWorkbenchStructuredDataSchemaFieldValue,
  formatWorkbenchStructuredDataSchemaLabel,
  getWorkbenchStructuredDataFormErrors,
  getWorkbenchStructuredDataSchemaFieldControl,
  getWorkbenchStructuredDataValue,
  isWorkbenchStructuredDataFormSubmittable,
  normalizeWorkbenchStructuredDataFormData,
  setWorkbenchStructuredDataValue,
  stringifyWorkbenchStructuredDataSchemaFieldValue,
  type WorkbenchStructuredDataFieldValue,
  type WorkbenchStructuredDataFormErrors,
  type WorkbenchStructuredDataFormField,
  type WorkbenchStructuredDataFormFieldChangeContext,
  type WorkbenchStructuredDataFormProps,
  type WorkbenchStructuredDataFormSection,
  type WorkbenchStructuredDataRecord,
  type WorkbenchStructuredDataSchemaFieldInputProps,
  type WorkbenchStructuredDataTable,
  type WorkbenchStructuredDataTextArrayInputProps,
} from './structuredDataSchema';

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

function isRenderableWorkbenchStructuredDataFormError(error: ReactNode) {
  return error !== undefined && error !== null && error !== false && error !== '';
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
        <WorkbenchStructuredDataTableView
          key={table.id}
          className="ui-workbench-structured-data-form__table-section"
          table={table}
        />
      ))}
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

function getStructuredDataLabelText(label: ReactNode, fallback: string) {
  if (typeof label === 'string' || typeof label === 'number') return String(label);
  return fallback;
}
