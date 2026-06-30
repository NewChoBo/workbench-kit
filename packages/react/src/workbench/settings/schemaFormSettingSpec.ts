import type { ReactNode } from 'react';
import type {
  WorkbenchSchemaFormField,
  WorkbenchSchemaFormFieldBase,
  WorkbenchSchemaFormFieldValue,
  WorkbenchSchemaFormOption,
} from './SchemaForm';

export type WorkbenchSchemaFormSettingValueType =
  | 'array'
  | 'boolean'
  | 'number'
  | 'object'
  | 'string';

export interface WorkbenchSchemaFormSettingSpec {
  readonly default?: unknown;
  readonly description?: ReactNode | undefined;
  readonly enum?: readonly (boolean | number | string)[] | undefined;
  readonly key: string;
  readonly label?: ReactNode | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly options?: readonly WorkbenchSchemaFormOption[] | undefined;
  readonly type: WorkbenchSchemaFormSettingValueType;
}

export interface WorkbenchSchemaFormSettingDefinitionLike {
  readonly defaultValue?: unknown;
  readonly enumValues?: readonly (boolean | number | string)[] | undefined;
  readonly key: string;
  readonly valueType: WorkbenchSchemaFormSettingValueType | 'enum';
}

export interface WorkbenchSchemaFormSettingDefinitionSpecOptions<
  TDefinition extends WorkbenchSchemaFormSettingDefinitionLike,
> {
  readonly description?: ((definition: TDefinition) => ReactNode | undefined) | undefined;
  readonly label?: ((definition: TDefinition) => ReactNode | undefined) | undefined;
  readonly metadata?:
    | ((definition: TDefinition) => Record<string, unknown> | undefined)
    | undefined;
  readonly options?:
    | ((definition: TDefinition) => readonly WorkbenchSchemaFormOption[] | undefined)
    | undefined;
  readonly type?:
    | ((definition: TDefinition) => WorkbenchSchemaFormSettingValueType | undefined)
    | undefined;
}

export function createWorkbenchSchemaFormFieldsFromSettingSpecs(
  settings: readonly WorkbenchSchemaFormSettingSpec[],
): WorkbenchSchemaFormField[] {
  return settings.map((setting) => createWorkbenchSchemaFormFieldFromSettingSpec(setting));
}

export function createWorkbenchSchemaFormFieldsFromSettingDefinitions<
  TDefinition extends WorkbenchSchemaFormSettingDefinitionLike,
>(
  definitions: readonly TDefinition[],
  options: WorkbenchSchemaFormSettingDefinitionSpecOptions<TDefinition> = {},
): WorkbenchSchemaFormField[] {
  return createWorkbenchSchemaFormFieldsFromSettingSpecs(
    definitions.map((definition) =>
      createWorkbenchSchemaFormSettingSpecFromDefinition(definition, options),
    ),
  );
}

export function createWorkbenchSchemaFormSettingSpecFromDefinition<
  TDefinition extends WorkbenchSchemaFormSettingDefinitionLike,
>(
  definition: TDefinition,
  options: WorkbenchSchemaFormSettingDefinitionSpecOptions<TDefinition> = {},
): WorkbenchSchemaFormSettingSpec {
  const resolvedOptions = options.options?.(definition);

  return {
    default: definition.defaultValue,
    description: options.description?.(definition),
    enum:
      resolvedOptions === undefined && definition.valueType === 'enum'
        ? definition.enumValues
        : undefined,
    key: definition.key,
    label: options.label?.(definition),
    metadata: options.metadata?.(definition),
    options: resolvedOptions,
    type: options.type?.(definition) ?? toWorkbenchSchemaFormSettingValueType(definition.valueType),
  };
}

export function createWorkbenchSchemaFormFieldFromSettingSpec(
  setting: WorkbenchSchemaFormSettingSpec,
): WorkbenchSchemaFormField {
  const base = createWorkbenchSchemaFormFieldBaseFromSettingSpec(setting);

  if (setting.options?.length || setting.enum?.length) {
    return {
      ...base,
      options: setting.options ?? setting.enum?.map(toWorkbenchSchemaFormOption) ?? [],
      type: 'select',
    };
  }

  if (setting.type === 'boolean') {
    return {
      ...base,
      type: 'checkbox',
    };
  }

  if (setting.type === 'number') {
    return {
      ...base,
      type: 'number',
    };
  }

  return {
    ...base,
    monospace: setting.type === 'array' || setting.type === 'object',
    type: 'text',
  };
}

function toWorkbenchSchemaFormSettingValueType(
  valueType: WorkbenchSchemaFormSettingDefinitionLike['valueType'],
): WorkbenchSchemaFormSettingValueType {
  return valueType === 'enum' ? 'string' : valueType;
}

function createWorkbenchSchemaFormFieldBaseFromSettingSpec(
  setting: WorkbenchSchemaFormSettingSpec,
): WorkbenchSchemaFormFieldBase {
  return {
    defaultValue: coerceWorkbenchSchemaFormSettingDefaultValue(setting),
    description: setting.description,
    id: setting.key,
    label: setting.label ?? setting.key,
    metadata: setting.metadata,
  };
}

export function coerceWorkbenchSchemaFormSettingDefaultValue(
  setting: WorkbenchSchemaFormSettingSpec,
): WorkbenchSchemaFormFieldValue | undefined {
  if (setting.default === undefined) {
    return undefined;
  }

  if (setting.type === 'boolean') {
    return Boolean(setting.default);
  }

  if (setting.type === 'number') {
    const value = Number(setting.default);
    return Number.isFinite(value) ? value : undefined;
  }

  if (setting.type === 'array' || setting.type === 'object') {
    return stringifyStructuredSettingDefault(setting.default);
  }

  return String(setting.default);
}

function stringifyStructuredSettingDefault(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

function toWorkbenchSchemaFormOption(value: boolean | number | string): WorkbenchSchemaFormOption {
  return {
    label: String(value),
    value: String(value),
  };
}
