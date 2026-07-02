import { evaluateWorkbenchContextKeyWhenClause } from '../context/context-keys.js';
import { CommandRegistry } from './command-registry.js';
import type {
  CommandDefinition,
  CommandPredicate,
  CommandValue,
  CommandWhenClause,
} from './types.js';

export interface CommandDefinitionConflict<TContext = void> {
  commandId: string;
  definitions: readonly CommandDefinition<TContext>[];
  indices: readonly number[];
}

export interface CommandMenuSeparatorEntry {
  id?: string | undefined;
  type: 'separator';
}

export interface CommandMenuCommandEntry<TContext = void> {
  commandId: string;
  danger?: CommandValue<TContext, boolean | undefined>;
  icon?: CommandValue<TContext, string | undefined>;
  id?: string | undefined;
  isEnabled?: CommandPredicate<TContext>;
  isVisible?: CommandPredicate<TContext>;
  label?: CommandValue<TContext, string> | undefined;
  shortcut?: CommandValue<TContext, string | undefined>;
  surfaces?: readonly string[] | undefined;
  type?: 'command';
  when?: CommandWhenClause<TContext>;
}

export type CommandMenuEntry<TContext = void> =
  | CommandMenuCommandEntry<TContext>
  | CommandMenuSeparatorEntry;

export interface CommandContribution<TContext = void> {
  commands: CommandDefinition<TContext>[];
  menuEntries: CommandMenuEntry<TContext>[];
}

export interface CommandContributionInput<TContext = void> {
  commands?: Iterable<CommandDefinition<TContext>>;
  menuEntries?: Iterable<CommandMenuEntry<TContext>>;
}

export type CommandConflictPolicy = 'last-write-wins' | 'hard-fail';

export interface CreateCommandRegistryOptions {
  conflictPolicy?: CommandConflictPolicy;
}

export interface SourcedCommandContribution<TContext = void> extends CommandContribution<TContext> {
  sourceId: string;
}

export interface ResolvedCommandMenuSeparatorItem {
  id?: string | undefined;
  type: 'separator';
}

export interface ResolvedCommandMenuCommandItem {
  commandId: string;
  danger?: boolean | undefined;
  disabled?: boolean | undefined;
  icon?: string | undefined;
  id: string;
  label: string;
  shortcut?: string | undefined;
  type: 'command';
}

export type CommandMenuItem = ResolvedCommandMenuCommandItem | ResolvedCommandMenuSeparatorItem;

export interface CommandMenuItemsInput<TContext = void> {
  context: TContext;
  contextKeys?: object;
  entries: CommandMenuEntry<TContext>[];
  registry: CommandRegistry<TContext>;
  surface?: string;
}

export interface CommandMenuCommandItemInput<TContext = void> extends Omit<
  CommandMenuItemsInput<TContext>,
  'entries'
> {
  commandId: string;
  entry?: Omit<CommandMenuCommandEntry<TContext>, 'commandId' | 'type'> | undefined;
}

export function createCommandRegistry<TContext>(
  commands: Iterable<CommandDefinition<TContext>>,
): CommandRegistry<TContext> {
  return new CommandRegistry(commands);
}

export function createCommandRegistryFromContributions<TContext = void>(
  contributions: CommandContributionInput<TContext>[],
  options: CreateCommandRegistryOptions = {},
): CommandRegistry<TContext> {
  const { conflictPolicy = 'last-write-wins' } = options;
  const merged = mergeCommandContributions<TContext>(...contributions);

  if (conflictPolicy === 'hard-fail') {
    assertNoCommandDefinitionConflicts(merged.commands);
  }

  return createCommandRegistry(merged.commands);
}

export function assertNoCommandDefinitionConflicts<TContext>(
  commands: Iterable<CommandDefinition<TContext>>,
): void {
  const conflicts = findCommandDefinitionConflicts(commands);
  if (!conflicts.length) return;

  const conflictSummary = conflicts
    .map(({ commandId, indices }) => `${commandId} -> duplicate indices: [${indices.join(', ')}]`)
    .join('; ');

  throw new Error(`Duplicate command IDs are not allowed: ${conflictSummary}`);
}

export function findCommandDefinitionConflicts<TContext>(
  commands: Iterable<CommandDefinition<TContext>>,
): CommandDefinitionConflict<TContext>[] {
  const encountered = new Map<
    string,
    { definitions: CommandDefinition<TContext>[]; indices: number[] }
  >();
  let index = 0;
  for (const command of commands) {
    const conflict = encountered.get(command.id) ?? { definitions: [], indices: [] };
    conflict.definitions.push(command);
    conflict.indices.push(index);
    encountered.set(command.id, conflict);
    index += 1;
  }

  return [...encountered.entries()]
    .filter(([, conflict]) => conflict.definitions.length > 1)
    .map(([commandId, conflict]) => ({
      commandId,
      definitions: [...conflict.definitions],
      indices: [...conflict.indices],
    }));
}

export function commandMenuEntry<TContext = void>(
  commandId: string,
  entry: Omit<CommandMenuCommandEntry<TContext>, 'commandId' | 'type'> = {},
): CommandMenuCommandEntry<TContext> {
  return { ...entry, commandId };
}

export function commandMenuEntries<TContext = void>(
  ...commandIds: string[]
): CommandMenuCommandEntry<TContext>[] {
  return commandIds.map((commandId) => commandMenuEntry<TContext>(commandId));
}

export function commandMenuSeparator(id?: string): CommandMenuSeparatorEntry {
  return { id, type: 'separator' };
}

export function defineCommandContribution<TContext = void>({
  commands = [],
  menuEntries = [],
}: CommandContributionInput<TContext>): CommandContribution<TContext> {
  return {
    commands: [...commands],
    menuEntries: [...menuEntries],
  };
}

export function mergeCommandContributions<TContext = void>(
  ...contributions: CommandContributionInput<TContext>[]
): CommandContribution<TContext> {
  return defineCommandContribution({
    commands: contributions.flatMap((contribution) => [...(contribution.commands ?? [])]),
    menuEntries: contributions.flatMap((contribution) => [...(contribution.menuEntries ?? [])]),
  });
}

export function canExecuteCommand<TContext>(
  registry: CommandRegistry<TContext>,
  commandId: string,
  context: TContext,
  contextKeys?: object,
) {
  const command = registry.get(commandId);
  return Boolean(
    command?.run &&
    isVisible(command, undefined, context, contextKeys) &&
    isEnabled(command, undefined, context, contextKeys),
  );
}

export function executeCommand<TContext>(
  registry: CommandRegistry<TContext>,
  commandId: string,
  context: TContext,
  contextKeys?: object,
) {
  const command = registry.get(commandId);
  if (!command || !canExecuteCommand(registry, commandId, context, contextKeys)) return false;

  command.run?.(context);
  return true;
}

export function compactCommandMenuItems(items: CommandMenuItem[]) {
  const compacted: CommandMenuItem[] = [];

  items.forEach((item) => {
    if (item.type !== 'separator') {
      compacted.push(item);
      return;
    }

    const previousItem = compacted[compacted.length - 1];
    if (!previousItem || previousItem.type === 'separator') return;

    compacted.push(item);
  });

  while (compacted[compacted.length - 1]?.type === 'separator') {
    compacted.pop();
  }

  return compacted;
}

export function resolveCommandMenuItems<TContext>({
  context,
  contextKeys,
  entries,
  registry,
  surface,
}: CommandMenuItemsInput<TContext>) {
  const items = entries.flatMap<CommandMenuItem>((entry) => {
    if (entry.type === 'separator') return [entry];
    if (!matchesSurface(entry, surface)) return [];

    const command = registry.get(entry.commandId);
    if (!command || !isVisible(command, entry, context, contextKeys)) return [];

    return [
      {
        commandId: command.id,
        danger: resolveCommandValue(entry.danger ?? command.danger, context),
        disabled: !isEnabled(command, entry, context, contextKeys),
        icon: resolveCommandValue(entry.icon ?? command.icon, context),
        id: entry.id ?? command.id,
        label: resolveCommandLabel(command, entry, context),
        shortcut: resolveCommandValue(entry.shortcut ?? command.shortcut, context),
        type: 'command',
      },
    ];
  });

  return compactCommandMenuItems(items);
}

export function resolveCommandMenuCommandItem<TContext>({
  commandId,
  entry,
  ...input
}: CommandMenuCommandItemInput<TContext>): ResolvedCommandMenuCommandItem | undefined {
  return resolveCommandMenuItems({
    ...input,
    entries: [commandMenuEntry<TContext>(commandId, entry)],
  }).find(
    (item): item is ResolvedCommandMenuCommandItem =>
      item.type === 'command' && item.commandId === commandId,
  );
}

export function resolveCommandValue<TContext, TValue>(
  value: CommandValue<TContext, TValue>,
  context: TContext,
): TValue;
export function resolveCommandValue<TContext, TValue>(
  value: CommandValue<TContext, TValue> | undefined,
  context: TContext,
): TValue | undefined;
export function resolveCommandValue<TContext, TValue>(
  value: CommandValue<TContext, TValue> | undefined,
  context: TContext,
): TValue | undefined {
  if (typeof value !== 'function') return value;
  return (value as (context: TContext) => TValue)(context);
}

export function resolveCommandDefinitionLabel<TContext>(
  command: Pick<CommandDefinition<TContext>, 'id' | 'label' | 'title'>,
  context: TContext,
): string {
  return resolveCommandValue(command.label, context) ?? command.title ?? command.id;
}

function resolveWhenClause<TContext>(
  when: CommandWhenClause<TContext> | undefined,
  context: TContext,
  contextKeys: object | undefined,
): boolean {
  if (when === undefined) return true;
  if (typeof when === 'string') {
    if (!contextKeys) return false;
    return evaluateWorkbenchContextKeyWhenClause(when, contextKeys);
  }
  return when(context);
}

function isVisible<TContext>(
  command: CommandDefinition<TContext>,
  entry: CommandMenuCommandEntry<TContext> | undefined,
  context: TContext,
  contextKeys: object | undefined,
) {
  return (
    resolveWhenClause(command.when, context, contextKeys) &&
    resolveWhenClause(entry?.when, context, contextKeys) &&
    command.isVisible?.(context) !== false &&
    entry?.isVisible?.(context) !== false
  );
}

function isEnabled<TContext>(
  command: CommandDefinition<TContext>,
  entry: CommandMenuCommandEntry<TContext> | undefined,
  context: TContext,
  contextKeys: object | undefined,
) {
  return (
    resolveWhenClause(command.enablement, context, contextKeys) &&
    command.isEnabled?.(context) !== false &&
    entry?.isEnabled?.(context) !== false
  );
}

function matchesSurface<TContext>(
  entry: CommandMenuCommandEntry<TContext>,
  surface: string | undefined,
) {
  if (!surface) return true;
  if (!entry.surfaces?.length) return true;
  return entry.surfaces.includes(surface);
}

function resolveCommandLabel<TContext>(
  command: CommandDefinition<TContext>,
  entry: CommandMenuCommandEntry<TContext>,
  context: TContext,
): string {
  const label = resolveCommandValue(entry.label, context);
  return label ?? resolveCommandDefinitionLabel(command, context);
}
