import { CommandRegistry } from '@workbench-kit/platform';
import {
  WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
  WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
  createWorkbenchShellCommands,
  getWorkbenchShowActivityCommandId,
  type WorkbenchShellCommandContext,
} from '@workbench-kit/react/workbench/commands';
import { describe, expect, it } from 'vitest';

import { registerWorkbenchShellCommandHandlers } from './workbench-shell-command-registration.js';

function createShellContext(
  calls: string[],
  overrides: Partial<WorkbenchShellCommandContext> = {},
): WorkbenchShellCommandContext {
  return {
    isPrimarySidebarVisible: true,
    openSettings: () => calls.push('settings'),
    showActivity: (activityId) => calls.push(`activity:${activityId}`),
    togglePrimarySidebar: () => calls.push('sidebar'),
    ...overrides,
  };
}

describe('registerWorkbenchShellCommandHandlers', () => {
  it('registers shell command handlers in the shared command registry', async () => {
    const calls: string[] = [];
    const registry = new CommandRegistry();
    const registration = registerWorkbenchShellCommandHandlers(
      registry,
      createWorkbenchShellCommands({
        activities: [{ id: 'explorer', label: 'Explorer', icon: 'codicon-files' }],
      }),
      () => createShellContext(calls),
    );

    await registry.getCommand(getWorkbenchShowActivityCommandId('explorer'))?.handler?.();
    await registry.getCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID)?.handler?.();
    await registry.getCommand(WORKBENCH_OPEN_SETTINGS_COMMAND_ID)?.handler?.();

    expect(calls).toEqual(['activity:explorer', 'sidebar', 'settings']);

    registration.dispose();

    expect(registry.hasCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID)).toBe(false);
  });

  it('uses the latest shell context when a registered command executes', async () => {
    const registry = new CommandRegistry();
    const calls: string[] = [];
    let context = createShellContext(calls, {
      togglePrimarySidebar: () => calls.push('first'),
    });
    registerWorkbenchShellCommandHandlers(
      registry,
      createWorkbenchShellCommands({ activities: [] }),
      () => context,
    );

    context = createShellContext(calls, {
      togglePrimarySidebar: () => calls.push('second'),
    });

    await registry.getCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID)?.handler?.();

    expect(calls).toEqual(['second']);
  });

  it('attaches handlers to existing command metadata without replacing it', async () => {
    const calls: string[] = [];
    const registry = new CommandRegistry([
      {
        category: 'Custom',
        id: WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
        title: 'Custom Toggle Sidebar',
      },
    ]);
    const registration = registerWorkbenchShellCommandHandlers(
      registry,
      createWorkbenchShellCommands({ activities: [] }),
      () => createShellContext(calls),
    );

    await registry.getCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID)?.handler?.();

    expect(calls).toEqual(['sidebar']);
    expect(registry.getCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID)).toMatchObject({
      category: 'Custom',
      title: 'Custom Toggle Sidebar',
    });

    registration.dispose();

    expect(
      registry.getCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID)?.handler,
    ).toBeUndefined();
  });
});
