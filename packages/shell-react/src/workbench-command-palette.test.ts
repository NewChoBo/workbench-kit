import {
  createCommandRegistryFromContributions,
  type CommandDefinition,
} from '@workbench-kit/platform';
import type { WorkbenchShellCommandContext } from '@workbench-kit/react/workbench';
import { describe, expect, it } from 'vitest';

import {
  buildWorkbenchPaletteCommands,
  matchesWorkbenchCommandPaletteShortcut,
  matchesWorkbenchQuickAccessShortcut,
  mergeWorkbenchCommandDescriptors,
} from './workbench-command-palette.js';

const sampleShellCommands: CommandDefinition<WorkbenchShellCommandContext>[] = [
  {
    id: 'workbench.showActivity.explorer',
    label: 'Show Explorer',
    run: ({ showActivity }) => showActivity('explorer'),
  },
  {
    id: 'workbench.togglePrimarySidebar',
    label: ({ isPrimarySidebarVisible }) =>
      isPrimarySidebarVisible ? 'Hide primary sidebar' : 'Show primary sidebar',
    run: ({ togglePrimarySidebar }) => togglePrimarySidebar(),
  },
];

describe('workbench-command-palette helpers', () => {
  it('merges palette commands without duplicate ids', () => {
    const merged = mergeWorkbenchCommandDescriptors(
      [{ id: 'a', label: 'A' }],
      [{ id: 'b', label: 'B' }],
      [{ id: 'a', label: 'A duplicate' }],
    );

    expect(merged).toEqual([
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]);
  });

  it('builds shell and extension palette commands', () => {
    const shellContext = {
      isPrimarySidebarVisible: true,
      openSettings: () => undefined,
      showActivity: () => undefined,
      togglePrimarySidebar: () => undefined,
    };
    const commands = buildWorkbenchPaletteCommands({
      additionalCommands: [{ category: 'File', id: 'sample.open', label: 'Open sample' }],
      extensionCommands: [
        {
          handler: async () => undefined,
          id: 'workspace.open',
          title: 'Open File',
          category: 'Workspace',
        },
      ],
      shellCommands: sampleShellCommands,
      shellContext,
    });

    expect(commands.some((command) => command.id === 'workbench.showActivity.explorer')).toBe(true);
    expect(commands.some((command) => command.id === 'workbench.togglePrimarySidebar')).toBe(true);
    expect(commands.some((command) => command.id === 'workspace.open')).toBe(true);
    expect(commands.some((command) => command.id === 'sample.open')).toBe(true);
  });

  it('keeps contributed commands visible before handler activation', () => {
    const shellContext = {
      isPrimarySidebarVisible: true,
      openSettings: () => undefined,
      showActivity: () => undefined,
      togglePrimarySidebar: () => undefined,
    };
    const commands = buildWorkbenchPaletteCommands({
      extensionCommands: [
        {
          category: 'Workspace',
          id: 'workspace.open',
          title: 'Open File',
        },
      ],
      shellCommands: [],
      shellContext,
    });

    expect(commands).toContainEqual(
      expect.objectContaining({
        category: 'Workspace',
        id: 'workspace.open',
        label: 'Open File',
      }),
    );
  });

  it('matches the default command palette shortcut', () => {
    expect(
      matchesWorkbenchCommandPaletteShortcut({
        altKey: false,
        ctrlKey: true,
        key: 'P',
        metaKey: false,
        shiftKey: true,
      }),
    ).toBe(true);

    expect(
      matchesWorkbenchCommandPaletteShortcut({
        altKey: false,
        ctrlKey: true,
        key: 'K',
        metaKey: false,
        shiftKey: true,
      }),
    ).toBe(false);
  });

  it('matches the quick access shortcut without shadowing the command palette shortcut', () => {
    expect(
      matchesWorkbenchQuickAccessShortcut({
        altKey: false,
        ctrlKey: true,
        key: 'P',
        metaKey: false,
        shiftKey: false,
      }),
    ).toBe(true);

    expect(
      matchesWorkbenchQuickAccessShortcut({
        altKey: false,
        ctrlKey: true,
        key: 'P',
        metaKey: false,
        shiftKey: true,
      }),
    ).toBe(false);
  });

  it('executes shell palette commands through the shell registry', () => {
    let sidebarVisible = true;
    const shellContext = {
      isPrimarySidebarVisible: sidebarVisible,
      openSettings: () => undefined,
      showActivity: () => undefined,
      togglePrimarySidebar: () => {
        sidebarVisible = !sidebarVisible;
      },
    };
    const registry = createCommandRegistryFromContributions<WorkbenchShellCommandContext>([
      {
        commands: [
          {
            id: 'workbench.togglePrimarySidebar',
            label: 'Toggle sidebar',
            run: ({ togglePrimarySidebar }) => togglePrimarySidebar(),
          },
        ],
      },
    ]);

    registry.get('workbench.togglePrimarySidebar')?.run?.(shellContext);
    expect(sidebarVisible).toBe(false);
  });
});
