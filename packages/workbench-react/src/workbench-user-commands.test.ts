import { describe, expect, it, vi } from 'vitest';
import { ExtensionRegistry } from '@workbench-kit/workbench-core';

import {
  executeWorkbenchUserCommandAction,
  registerWorkbenchUserCommands,
} from './workbench-user-commands.js';

describe('workbench-user-commands', () => {
  it('executes sequence actions in order', async () => {
    const calls: string[] = [];
    const executeCommand = vi.fn(async (commandId: string) => {
      calls.push(commandId);
    });

    await executeWorkbenchUserCommandAction(
      {
        type: 'sequence',
        steps: [
          { type: 'executeCommand', command: 'editor.save' },
          { type: 'executeCommand', command: 'workspace.open' },
        ],
      },
      executeCommand,
    );

    expect(calls).toEqual(['editor.save', 'workspace.open']);
  });

  it('registers user commands on the extension registry', async () => {
    const registry = new ExtensionRegistry();
    registry.commands.registerCommand({
      handler: () => undefined,
      id: 'editor.save',
      title: 'Save',
    });
    const disposables = registerWorkbenchUserCommands(registry, [
      {
        command: 'workbench-kit.user.test',
        title: 'Test',
        action: {
          type: 'executeCommand',
          command: 'editor.save',
        },
      },
    ]);

    await registry.executeCommand('workbench-kit.user.test');
    disposables.dispose();
  });
});
