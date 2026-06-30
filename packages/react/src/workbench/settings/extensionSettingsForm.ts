import {
  createWorkbenchSchemaFormFieldFromSettingSpec,
  type WorkbenchSchemaFormSettingValueType,
} from './schemaFormSettingSpec';
import type { WorkbenchSchemaFormField } from './SchemaForm';

export type WorkbenchExtensionSettingValueType = WorkbenchSchemaFormSettingValueType;

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
  return createWorkbenchSchemaFormFieldFromSettingSpec({
    ...setting,
    metadata: {
      scope: setting.scope,
      settingType: setting.type,
    },
  });
}
