import type {
  WorkbenchStructuredDataSchemaFieldControl,
  WorkbenchStructuredDataSchemaFieldDefinition,
} from './structuredDataSchemaTypes';

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

export function formatWorkbenchStructuredDataSchemaLabel(value: string) {
  return value.replace(/_/g, ' ');
}
