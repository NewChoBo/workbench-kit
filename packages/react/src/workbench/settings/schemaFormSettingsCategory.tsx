import { WorkbenchSchemaForm, type WorkbenchSchemaFormProps } from './SchemaForm';
import type { WorkbenchSettingsCategory } from './types';

export interface WorkbenchSchemaFormSettingsCategoryInput extends Omit<
  WorkbenchSettingsCategory,
  'content'
> {
  readonly fields: WorkbenchSchemaFormProps['fields'];
  readonly formProps?: Omit<WorkbenchSchemaFormProps, 'fields'> | undefined;
}

export function createWorkbenchSchemaFormSettingsCategory({
  fields,
  formProps,
  ...category
}: WorkbenchSchemaFormSettingsCategoryInput): WorkbenchSettingsCategory {
  return {
    ...category,
    content: <WorkbenchSchemaForm {...formProps} fields={fields} />,
  };
}
