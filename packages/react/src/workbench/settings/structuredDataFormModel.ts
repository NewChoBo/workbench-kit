import type { ReactNode } from 'react';
import {
  getWorkbenchStructuredDataValue,
  setWorkbenchStructuredDataValue,
} from '@workbench-kit/workspace';
import type {
  WorkbenchStructuredDataFieldValue,
  WorkbenchStructuredDataFormErrors,
  WorkbenchStructuredDataFormField,
  WorkbenchStructuredDataFormSection,
  WorkbenchStructuredDataRecord,
} from './structuredDataSchemaTypes';

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
