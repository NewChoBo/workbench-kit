import { describe, expect, it } from 'vitest';
import {
  commandMenuEntries,
  commandMenuEntry,
  commandMenuSeparator,
  createCommandRegistry,
  createCommandRegistryFromContributions,
  assertNoCommandDefinitionConflicts,
  findCommandDefinitionConflicts,
  defineCommandContribution,
  executeCommand,
  mergeCommandContributions,
  resolveCommandMenuItems,
  type CommandDefinition,
  type SourcedCommandContribution,
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
  it('keeps the last command definition when command IDs collide', () => {
    const registry = createCommandRegistry<TestContext>([
      {
        id: 'dup-open',
        label: 'first open',
        run: ({ log }) => log.push('first'),
      },
      {
        id: 'dup-open',
        label: 'second open',
        run: ({ log }) => log.push('second'),
      },
      {
        id: 'open',
        icon: 'codicon-go-to-file',
        label: ({ target }) => `Open ${target}`,
        run: ({ log, target }) => log.push(`open:${target}`),
        shortcut: 'Enter',
      },
    ]);

    const context: TestContext = { enabled: false, hidden: false, log: [], target: 'file.ts' };

    expect(executeCommand(registry, 'dup-open', context)).toBe(true);
    expect(context.log).toEqual(['second']);
  });

  it('detects duplicate command definition conflicts and includes source order indices', () => {
    const collisions = findCommandDefinitionConflicts([
      { id: 'open', label: 'primary' },
      { id: 'rename', label: 'rename v1' },
      { id: 'open', label: 'override', shortcut: 'Enter' },
      { id: 'search', label: 'search' },
      { id: 'open', label: 'final override' },
    ]);

    expect(collisions).toEqual([
      {
        commandId: 'open',
        definitions: [
          { id: 'open', label: 'primary' },
          { id: 'open', label: 'override', shortcut: 'Enter' },
          { id: 'open', label: 'final override' },
        ],
        indices: [0, 2, 4],
      },
    ]);
  });

  it('throws a meaningful error when hard-fail mode detects duplicate command IDs', () => {
    const duplicateCommands: CommandDefinition<TestContext>[] = [
      { id: 'save', label: 'first save' },
      { id: 'rename', label: 'rename' },
      { id: 'save', label: 'overwrite save' },
    ];

    expect(() => assertNoCommandDefinitionConflicts(duplicateCommands)).toThrow(
      'Duplicate command IDs are not allowed: save -> duplicate indices: [0, 2]',
    );
  });

  it('creates command registry from contributions in permissive mode by default', () => {
    const contributionA = defineCommandContribution<TestContext>({
      commands: [{ id: 'shared', label: 'first' }],
      menuEntries: [{ commandId: 'shared' }],
    });
    const contributionB = defineCommandContribution<TestContext>({
      commands: [{ id: 'shared', label: 'second' }],
      menuEntries: [{ commandId: 'shared' }],
    });
    const registry = createCommandRegistryFromContributions<TestContext>([
      contributionA,
      contributionB,
    ]);

    expect(registry.get('shared')).toMatchObject({ label: 'second' });
  });

  it('hard-fails when command registry contributions contain duplicate IDs', () => {
    const contributionA = defineCommandContribution<TestContext>({
      commands: [{ id: 'shared', label: 'first' }],
      menuEntries: [{ commandId: 'shared' }],
    });
    const contributionB = defineCommandContribution<TestContext>({
      commands: [{ id: 'shared', label: 'second' }],
      menuEntries: [{ commandId: 'shared' }],
    });

    expect(() =>
      createCommandRegistryFromContributions<TestContext>([contributionA, contributionB], {
        conflictPolicy: 'hard-fail',
      }),
    ).toThrow('Duplicate command IDs are not allowed: shared -> duplicate indices: [0, 1]');
  });

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

  it('builds reusable menu entries and command contributions', () => {
    const primaryContribution = defineCommandContribution({
      commands,
      menuEntries: [
        commandMenuEntry<TestContext>('open', { id: 'open-current' }),
        ...commandMenuEntries<TestContext>('rename'),
      ],
    });
    const secondaryContribution = defineCommandContribution<TestContext>({
      menuEntries: [commandMenuSeparator('after-primary'), commandMenuEntry('hidden')],
    });
    const merged = mergeCommandContributions(primaryContribution, secondaryContribution);
    const sourcedContribution = {
      ...merged,
      sourceId: 'installed.plugin',
    } satisfies SourcedCommandContribution<TestContext>;

    expect(primaryContribution.menuEntries).toEqual([
      { commandId: 'open', id: 'open-current' },
      { commandId: 'rename' },
    ]);
    expect(sourcedContribution.sourceId).toBe('installed.plugin');
    expect(merged.commands).toHaveLength(3);
    expect(merged.menuEntries).toEqual([
      { commandId: 'open', id: 'open-current' },
      { commandId: 'rename' },
      { id: 'after-primary', type: 'separator' },
      { commandId: 'hidden' },
    ]);
  });

  it('filters menu entries by surface metadata', () => {
    const registry = createCommandRegistry(commands);
    const entries = [
      { commandId: 'open', surfaces: ['explorer', 'editor'] },
      { commandId: 'rename', surfaces: ['search'] },
      { commandId: 'open', surfaces: ['search', 'settings'] },
      { commandId: 'hidden', surfaces: ['explorer'] },
    ];

    expect(
      resolveCommandMenuItems({
        context: { enabled: true, hidden: false, log: [], target: 'file.ts' },
        entries,
        registry,
        surface: 'search',
      }).map((item) => item.type === 'command' && item.commandId),
    ).toEqual(['rename', 'open']);

    expect(
      resolveCommandMenuItems({
        context: { enabled: false, hidden: false, log: [], target: 'file.ts' },
        entries,
        registry,
        surface: 'search',
      }).map((item) => item.type === 'command' && item.commandId),
    ).toEqual(['rename', 'open']);

    expect(
      resolveCommandMenuItems({
        context: { enabled: true, hidden: false, log: [], target: 'file.ts' },
        entries,
        registry,
        surface: 'explorer',
      }).map((item) => item.type === 'command' && item.commandId),
    ).toEqual(['open', 'hidden']);
  });

  it('filters menu items by string when clauses and context keys', () => {
    const registry = createCommandRegistry([
      {
        id: 'rename',
        label: 'Rename',
        run: ({ log }) => log.push('rename'),
        when: 'workspace.hasSelection',
      },
      {
        id: 'open',
        label: 'Open',
        run: ({ log, target }) => log.push(`open:${target}`),
      },
    ]);
    const entries = commandMenuEntries('rename', 'open');
    const context: TestContext = { enabled: true, hidden: false, log: [], target: 'file.ts' };

    expect(
      resolveCommandMenuItems({
        context,
        contextKeys: { 'workspace.hasSelection': false },
        entries,
        registry,
      }).map((item) => item.type === 'command' && item.commandId),
    ).toEqual(['open']);

    expect(
      resolveCommandMenuItems({
        context,
        contextKeys: { 'workspace.hasSelection': true },
        entries,
        registry,
      }).map((item) => item.type === 'command' && item.commandId),
    ).toEqual(['rename', 'open']);
  });
});
