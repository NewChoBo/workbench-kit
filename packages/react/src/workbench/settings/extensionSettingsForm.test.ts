import { describe, expect, it } from 'vitest';

import {
  createWorkbenchSchemaFormFieldFromSetting,
  createWorkbenchSchemaFormFieldsFromSettings,
} from './extensionSettingsForm';

describe('extension settings form adapter', () => {
  it('maps boolean, number, enum, and structured settings to schema form fields', () => {
    expect(
      createWorkbenchSchemaFormFieldsFromSettings([
        {
          default: true,
          description: 'Enable the workbench account entry point.',
          key: 'workbench.accounts.enabled',
          scope: 'application',
          type: 'boolean',
        },
        {
          default: 3,
          key: 'workbench.search.limit',
          type: 'number',
        },
        {
          default: 'dark',
          enum: ['dark', 'light'],
          key: 'workbench.theme',
          type: 'string',
        },
        {
          default: ['explorer'],
          key: 'workbench.activityBar.itemOrder',
          type: 'array',
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        defaultValue: true,
        id: 'workbench.accounts.enabled',
        type: 'checkbox',
      }),
      expect.objectContaining({
        defaultValue: 3,
        id: 'workbench.search.limit',
        type: 'number',
      }),
      expect.objectContaining({
        defaultValue: 'dark',
        id: 'workbench.theme',
        options: [
          {
            label: 'dark',
            value: 'dark',
          },
          {
            label: 'light',
            value: 'light',
          },
        ],
        type: 'select',
      }),
      expect.objectContaining({
        defaultValue: '[\n  "explorer"\n]',
        id: 'workbench.activityBar.itemOrder',
        monospace: true,
        type: 'text',
      }),
    ]);
  });

  it('keeps invalid number defaults empty', () => {
    expect(
      createWorkbenchSchemaFormFieldFromSetting({
        default: 'not-a-number',
        key: 'workbench.badNumber',
        type: 'number',
      }),
    ).toEqual(
      expect.objectContaining({
        defaultValue: undefined,
        type: 'number',
      }),
    );
  });
});
