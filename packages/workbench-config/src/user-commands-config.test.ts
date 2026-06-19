import { describe, expect, it } from 'vitest';

import { parseWorkbenchUserCommandsConfig } from './user-commands-config.js';

describe('parseWorkbenchUserCommandsConfig', () => {
  it('parses executeCommand and sequence actions', () => {
    expect(
      parseWorkbenchUserCommandsConfig({
        version: 1,
        commands: [
          {
            command: 'workbench-kit.user.open-readme',
            title: 'Open README',
            action: {
              type: 'executeCommand',
              command: 'workspace.open',
              args: { paths: ['README.md'] },
            },
          },
          {
            command: 'workbench-kit.user.save-and-settings',
            title: 'Save and Settings',
            action: {
              type: 'sequence',
              steps: [
                { type: 'executeCommand', command: 'editor.save' },
                { type: 'executeCommand', command: 'workbench-kit.builtin.settings.open' },
              ],
            },
          },
        ],
      }),
    ).toEqual({
      version: 1,
      commands: [
        {
          command: 'workbench-kit.user.open-readme',
          title: 'Open README',
          action: {
            type: 'executeCommand',
            command: 'workspace.open',
            args: { paths: ['README.md'] },
          },
        },
        {
          command: 'workbench-kit.user.save-and-settings',
          title: 'Save and Settings',
          action: {
            type: 'sequence',
            steps: [
              { type: 'executeCommand', command: 'editor.save' },
              { type: 'executeCommand', command: 'workbench-kit.builtin.settings.open' },
            ],
          },
        },
      ],
    });
  });
});
