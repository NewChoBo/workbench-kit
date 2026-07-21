import { describe, expect, it } from 'vitest';
import {
  coerceWorkbenchSchemaFormSettingDefaultValue,
  createWorkbenchSchemaFormFieldsFromSettingDefinitions,
  createWorkbenchSchemaFormFieldFromSettingSpec,
  createWorkbenchSchemaFormFieldsFromSettingSpecs,
} from './schemaFormSettingSpec';

describe('schema form setting spec adapter', () => {
  it('maps product setting specs to schema form fields with labels and options', () => {
    expect(
      createWorkbenchSchemaFormFieldsFromSettingSpecs([
        {
          default: 'system',
          key: 'locale',
          label: 'Language',
          options: [
            { label: 'System', value: 'system' },
            { label: 'English', value: 'en-US' },
          ],
          type: 'string',
        },
        {
          default: true,
          key: 'contentHubAutoOpen',
          label: 'Open Content Hub on startup',
          type: 'boolean',
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        defaultValue: 'system',
        id: 'locale',
        label: 'Language',
        options: [
          { label: 'System', value: 'system' },
          { label: 'English', value: 'en-US' },
        ],
        type: 'select',
      }),
      expect.objectContaining({
        defaultValue: true,
        id: 'contentHubAutoOpen',
        label: 'Open Content Hub on startup',
        type: 'checkbox',
      }),
    ]);
  });

  it('preserves metadata and coerces structured defaults', () => {
    expect(
      createWorkbenchSchemaFormFieldFromSettingSpec({
        default: { compact: true },
        key: 'workbench.layout',
        metadata: { section: 'appearance' },
        type: 'object',
      }),
    ).toEqual(
      expect.objectContaining({
        defaultValue: '{\n  "compact": true\n}',
        label: 'workbench.layout',
        metadata: { section: 'appearance' },
        monospace: true,
        type: 'text',
      }),
    );

    expect(
      coerceWorkbenchSchemaFormSettingDefaultValue({
        default: 'bad',
        key: 'limit',
        type: 'number',
      }),
    ).toBeUndefined();
  });

  it('maps registry-like setting definitions to schema form fields', () => {
    expect(
      createWorkbenchSchemaFormFieldsFromSettingDefinitions(
        [
          {
            defaultValue: 'dark',
            enumValues: ['dark', 'light'],
            key: 'workbench.theme',
            storageKey: 'ui.theme',
            title: 'Theme',
            valueType: 'enum',
          },
          {
            defaultValue: true,
            key: 'workbench.launchOnStartup',
            storageKey: 'runtime.launchOnStartup',
            title: 'Launch on startup',
            valueType: 'boolean',
          },
        ],
        {
          label: (definition) => definition.title,
          metadata: (definition) => ({ storageKey: definition.storageKey }),
        },
      ),
    ).toEqual([
      expect.objectContaining({
        defaultValue: 'dark',
        id: 'workbench.theme',
        label: 'Theme',
        metadata: { storageKey: 'ui.theme' },
        options: [
          { label: 'dark', value: 'dark' },
          { label: 'light', value: 'light' },
        ],
        type: 'select',
      }),
      expect.objectContaining({
        defaultValue: true,
        id: 'workbench.launchOnStartup',
        label: 'Launch on startup',
        metadata: { storageKey: 'runtime.launchOnStartup' },
        type: 'checkbox',
      }),
    ]);
  });

  it('lets registry adapters override enum labels with schema form options', () => {
    expect(
      createWorkbenchSchemaFormFieldsFromSettingDefinitions(
        [
          {
            defaultValue: 'system',
            enumValues: ['system', 'dark'],
            key: 'workbench.theme',
            valueType: 'enum',
          },
        ],
        {
          options: () => [
            { label: 'Follow system', value: 'system' },
            { label: 'Dark', value: 'dark' },
          ],
        },
      ),
    ).toEqual([
      expect.objectContaining({
        options: [
          { label: 'Follow system', value: 'system' },
          { label: 'Dark', value: 'dark' },
        ],
        type: 'select',
      }),
    ]);
  });
});
