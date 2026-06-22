import type {
  WorkbenchStructuredDataSchemaFieldDefinition,
  WorkbenchStructuredDataSchemaSelectOption,
} from './structuredDataSchemaTypes';

export const SCHEMA_FIELD_PATTERN_WARNING = 'Value does not match the required format.';
export const SCHEMA_FIELD_MIN_WARNING = 'Value is below the minimum allowed.';
export const SCHEMA_FIELD_MAX_WARNING = 'Value is above the maximum allowed.';

const SMALL_ENUM_RADIO_THRESHOLD = 4;

export interface WorkbenchStructuredDataSchemaSelectFieldOption {
  disabled?: boolean | undefined;
  label: string;
  value: string;
}

export function isWorkbenchStructuredDataSchemaColorField(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): boolean {
  if (!definition) return false;
  return (
    definition.format === 'color' ||
    definition['x-workbench-color'] === true ||
    definition.ui?.control === 'color'
  );
}

export function hasWorkbenchStructuredDataSchemaSelectOptions(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): boolean {
  if (!definition) return false;
  return Boolean(
    definition.selectable ||
    definition.oneOf?.length ||
    definition.ui?.options?.length ||
    definition.enum?.length,
  );
}

export function shouldUseWorkbenchStructuredDataSchemaRadioControl(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): boolean {
  if (!definition || definition.ui?.control === 'select') return false;
  if (definition.ui?.control === 'radio') return true;

  const options = buildWorkbenchStructuredDataSchemaSelectOptions(definition);
  return options.length > 0 && options.length <= SMALL_ENUM_RADIO_THRESHOLD;
}

export function buildWorkbenchStructuredDataSchemaSelectOptions(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
): readonly WorkbenchStructuredDataSchemaSelectFieldOption[] {
  if (!definition) return [];

  const uiOptions = definition.ui?.options;
  if (uiOptions?.length) {
    return uiOptions.map((option) => normalizeSchemaSelectOption(option));
  }

  const oneOfOptions = definition.oneOf;
  if (oneOfOptions?.length) {
    return oneOfOptions
      .filter((option) => option.const !== undefined)
      .map((option) => ({
        label: option.title ?? String(option.const),
        value: String(option.const),
      }));
  }

  const enumValues = definition.enum;
  if (!enumValues?.length) return [];

  const enumLabels = resolveEnumLabels(definition, enumValues.length);
  return enumValues.map((value, index) => ({
    label: enumLabels[index] ?? String(value),
    value: String(value),
  }));
}

export function validateWorkbenchStructuredDataSchemaFieldValue(
  definition: WorkbenchStructuredDataSchemaFieldDefinition | undefined,
  value: unknown,
): string | undefined {
  if (!definition) return undefined;

  if (definition.type === 'number' || definition.type === 'integer') {
    if (value === '' || value === null || value === undefined) return undefined;
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) return undefined;

    const min = definition.minimum ?? definition.min;
    const max = definition.maximum ?? definition.max;
    if (min !== undefined && numericValue < min) return SCHEMA_FIELD_MIN_WARNING;
    if (max !== undefined && numericValue > max) return SCHEMA_FIELD_MAX_WARNING;
    return undefined;
  }

  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (definition.pattern) {
    try {
      const regex = new RegExp(definition.pattern);
      if (trimmed !== '' && !regex.test(value)) {
        return SCHEMA_FIELD_PATTERN_WARNING;
      }
    } catch {
      return undefined;
    }
  }

  const minLength = definition.minLength;
  const maxLength = definition.maxLength;
  if (minLength !== undefined && trimmed.length < minLength) {
    return `Value must be at least ${minLength} characters.`;
  }
  if (maxLength !== undefined && trimmed.length > maxLength) {
    return `Value must be at most ${maxLength} characters.`;
  }

  return undefined;
}

function normalizeSchemaSelectOption(
  option: WorkbenchStructuredDataSchemaSelectOption,
): WorkbenchStructuredDataSchemaSelectFieldOption {
  return {
    disabled: option.disabled,
    label: option.label ?? String(option.value),
    value: String(option.value),
  };
}

function resolveEnumLabels(
  definition: WorkbenchStructuredDataSchemaFieldDefinition,
  enumLength: number,
) {
  const enumLabels = definition.ui?.enumLabels;
  if (!enumLabels) {
    return definition.enumNames ?? [];
  }

  if (Array.isArray(enumLabels)) {
    return enumLabels;
  }

  const labelRecord = enumLabels as Record<string, string>;
  return Array.from({ length: enumLength }, (_, index) => {
    const enumValue = definition.enum?.[index];
    if (enumValue === undefined) return '';
    return labelRecord[String(enumValue)] ?? String(enumValue);
  });
}
