import type {
  WorkbenchSchemaFormField,
  WorkbenchSchemaFormFieldBase,
  WorkbenchSchemaFormFieldValue,
  WorkbenchSchemaFormOption,
} from './SchemaForm';

export type WorkbenchExtensionSettingValueType =
  | 'array'
  | 'boolean'
  | 'number'
  | 'object'
  | 'string';

export interface WorkbenchExtensionSettingSpec {
  readonly default?: unknown;
  readonly description?: string | undefined;
  readonly enum?: readonly (boolean | number | string)[] | undefined;
  readonly key: string;
  readonly scope?: string | undefined;
  readonly type: WorkbenchExtensionSettingValueType;
}

export function createWorkbenchSchemaFormFieldsFromSettings(
  settings: readonly WorkbenchExtensionSettingSpec[],
): WorkbenchSchemaFormField[] {
  return settings.map((setting) => createWorkbenchSchemaFormFieldFromSetting(setting));
}

export function createWorkbenchSchemaFormFieldFromSetting(
  setting: WorkbenchExtensionSettingSpec,
): WorkbenchSchemaFormField {
  const base = createWorkbenchSchemaFormFieldBase(setting);

  if (setting.enum?.length) {
    return {
      ...base,
      options: setting.enum.map(toWorkbenchSchemaFormOption),
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

function createWorkbenchSchemaFormFieldBase(
  setting: WorkbenchExtensionSettingSpec,
): WorkbenchSchemaFormFieldBase {
  return {
    defaultValue: coerceWorkbenchExtensionSettingDefaultValue(setting),
    description: setting.description,
    id: setting.key,
    label: setting.key,
    metadata: {
      scope: setting.scope,
      settingType: setting.type,
    },
  };
}

function coerceWorkbenchExtensionSettingDefaultValue(
  setting: WorkbenchExtensionSettingSpec,
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
