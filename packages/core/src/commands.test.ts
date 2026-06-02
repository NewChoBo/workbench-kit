import { describe, expect, it } from 'vitest';
import {
  commandMenuSeparator,
  createCommandRegistry,
  executeCommand,
  resolveCommandMenuItems,
  type CommandDefinition,
} from './commands';

interface TestContext {
  enabled: boolean;
  hidden: boolean;
  log: string[];
  target: string;
}

const commands: CommandDefinition<TestContext>[] = [
  {
    id: 'open',
    icon: 'codicon-go-to-file',
    label: ({ target }) => `Open ${target}`,
    run: ({ log, target }) => log.push(`open:${target}`),
    shortcut: 'Enter',
  },
  {
    id: 'rename',
    isEnabled: ({ enabled }) => enabled,
    label: 'Rename',
    run: ({ log }) => log.push('rename'),
  },
  {
    id: 'hidden',
    isVisible: ({ hidden }) => !hidden,
    label: 'Hidden command',
    run: ({ log }) => log.push('hidden'),
  },
];

describe('commands', () => {
  it('projects command definitions into compact menu items', () => {
    const registry = createCommandRegistry(commands);
    const items = resolveCommandMenuItems({
      context: { enabled: false, hidden: true, log: [], target: 'file.ts' },
      entries: [
        commandMenuSeparator('leading'),
        { commandId: 'open' },
        commandMenuSeparator('after-open'),
        commandMenuSeparator('duplicate'),
        { commandId: 'rename' },
        { commandId: 'missing' },
        { commandId: 'hidden' },
        commandMenuSeparator('trailing'),
      ],
      registry,
    });

    expect(items).toEqual([
      {
        commandId: 'open',
        danger: undefined,
        disabled: false,
        icon: 'codicon-go-to-file',
        id: 'open',
        label: 'Open file.ts',
        shortcut: 'Enter',
        type: 'command',
      },
      { id: 'after-open', type: 'separator' },
      {
        commandId: 'rename',
        danger: undefined,
        disabled: true,
        icon: undefined,
        id: 'rename',
        label: 'Rename',
        shortcut: undefined,
        type: 'command',
      },
    ]);
  });

  it('executes only visible and enabled commands with handlers', () => {
    const registry = createCommandRegistry(commands);
    const context: TestContext = { enabled: true, hidden: false, log: [], target: 'file.ts' };

    expect(executeCommand(registry, 'open', context)).toBe(true);
    expect(executeCommand(registry, 'missing', context)).toBe(false);
    expect(context.log).toEqual(['open:file.ts']);

    context.enabled = false;
    expect(executeCommand(registry, 'rename', context)).toBe(false);
    expect(context.log).toEqual(['open:file.ts']);
  });
});
