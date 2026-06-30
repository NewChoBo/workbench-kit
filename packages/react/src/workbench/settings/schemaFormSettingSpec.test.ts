import { describe, expect, it } from 'vitest';
import {
  coerceWorkbenchSchemaFormSettingDefaultValue,
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
});
