import { describe, expect, it } from 'vitest';
import {
  commandMenuItemsToWorkbenchCommandDescriptors,
  filterWorkbenchCommands,
  getNextWorkbenchCommandIndex,
  isWorkbenchCommandRunnable,
  type WorkbenchCommandDescriptor,
} from './CommandPalette';

const commands: WorkbenchCommandDescriptor[] = [
  {
    category: 'View',
    description: 'Open the selected artifact preview.',
    icon: 'codicon-open-preview',
    id: 'artifact.openPreview',
    label: 'Open preview',
    shortcut: 'Ctrl+Enter',
  },
  {
    category: 'Workspace',
    description: 'Write a generated artifact into the workspace.',
    disabled: true,
    disabledReason: 'Workspace is read-only',
    icon: 'codicon-file-code',
    id: 'workspace.writeArtifact',
    label: 'Write artifact',
    sideEffect: 'workspace-write',
  },
  {
    category: 'Command',
    execution: { kind: 'remote' },
    id: 'operation.validateSelection',
    label: 'Validate selection',
    status: 'waiting',
  },
];

describe('workbench command helpers', () => {
  it('filters commands by label, description, category, id, and shortcut', () => {
    expect(
      filterWorkbenchCommands({ commands, query: 'preview' }).map((command) => command.id),
    ).toEqual(['artifact.openPreview']);
    expect(
      filterWorkbenchCommands({ commands, query: 'workspace write' }).map((command) => command.id),
    ).toEqual(['workspace.writeArtifact']);
    expect(
      filterWorkbenchCommands({ commands, query: 'ctrl' }).map((command) => command.id),
    ).toEqual(['artifact.openPreview']);
    expect(filterWorkbenchCommands({ commands, query: 'missing' })).toEqual([]);
  });

  it('limits filtered commands when requested', () => {
    expect(filterWorkbenchCommands({ commands, limit: 2 }).map((command) => command.id)).toEqual([
      'artifact.openPreview',
      'workspace.writeArtifact',
    ]);
  });

  it('navigates to the next runnable command and skips disabled commands', () => {
    expect(
      getNextWorkbenchCommandIndex({
        commands,
        currentIndex: 0,
        direction: 'next',
      }),
    ).toBe(2);
    expect(
      getNextWorkbenchCommandIndex({
        commands,
        currentIndex: 2,
        direction: 'next',
      }),
    ).toBe(0);
    expect(
      getNextWorkbenchCommandIndex({
        commands,
        currentIndex: 0,
        direction: 'previous',
      }),
    ).toBe(2);
  });

  it('reports disabled and unavailable commands as not runnable', () => {
    expect(isWorkbenchCommandRunnable(commands[0])).toBe(true);
    expect(isWorkbenchCommandRunnable(commands[1])).toBe(false);
    expect(isWorkbenchCommandRunnable({ ...commands[0], status: 'unavailable' })).toBe(false);
  });

  it('converts resolved menu command items into command descriptors', () => {
    const descriptors = commandMenuItemsToWorkbenchCommandDescriptors(
      [
        {
          commandId: 'workspace.open',
          danger: undefined,
          disabled: false,
          icon: 'codicon-go-to-file',
          id: 'workspace.open',
          label: 'Open file',
          shortcut: 'Enter',
          type: 'command',
        },
        { id: 'separator', type: 'separator' },
      ],
      {
        'workspace.open': {
          category: 'Workspace',
          execution: { kind: 'local' },
          feedback: 'status',
        },
      },
    );

    expect(descriptors).toEqual([
      {
        category: 'Workspace',
        danger: undefined,
        disabled: false,
        execution: { kind: 'local' },
        feedback: 'status',
        icon: 'codicon-go-to-file',
        id: 'workspace.open',
        label: 'Open file',
        metadata: { menuItemId: 'workspace.open' },
        shortcut: 'Enter',
      },
    ]);
  });
});
