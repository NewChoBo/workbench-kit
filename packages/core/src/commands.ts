export type CommandValue<TContext, TValue> = TValue | ((context: TContext) => TValue);
export type CommandPredicate<TContext> = (context: TContext) => boolean;
export type CommandHandler<TContext> = (context: TContext) => void;

export interface CommandDefinition<TContext = void> {
  danger?: CommandValue<TContext, boolean | undefined>;
  icon?: CommandValue<TContext, string | undefined>;
  id: string;
  isEnabled?: CommandPredicate<TContext>;
  isVisible?: CommandPredicate<TContext>;
  label: CommandValue<TContext, string>;
  run?: CommandHandler<TContext>;
  shortcut?: CommandValue<TContext, string | undefined>;
}

export type CommandRegistry<TContext = void> = ReadonlyMap<string, CommandDefinition<TContext>>;

export interface CommandMenuSeparatorEntry {
  id?: string;
  type: 'separator';
}

export interface CommandMenuCommandEntry<TContext = void> {
  commandId: string;
  danger?: CommandValue<TContext, boolean | undefined>;
  icon?: CommandValue<TContext, string | undefined>;
  id?: string;
  isEnabled?: CommandPredicate<TContext>;
  isVisible?: CommandPredicate<TContext>;
  label?: CommandValue<TContext, string>;
  shortcut?: CommandValue<TContext, string | undefined>;
  type?: 'command';
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

export interface SourcedCommandContribution<TContext = void> extends CommandContribution<TContext> {
  sourceId: string;
}

export interface ResolvedCommandMenuSeparatorItem {
  id?: string;
  type: 'separator';
}

export interface ResolvedCommandMenuCommandItem {
  commandId: string;
  danger?: boolean;
  disabled?: boolean;
  icon?: string;
  id: string;
  label: string;
  shortcut?: string;
  type: 'command';
}

export type CommandMenuItem = ResolvedCommandMenuCommandItem | ResolvedCommandMenuSeparatorItem;

export interface CommandMenuItemsInput<TContext = void> {
  context: TContext;
  entries: CommandMenuEntry<TContext>[];
  registry: CommandRegistry<TContext>;
}

function resolveValue<TContext, TValue>(
  value: CommandValue<TContext, TValue>,
  context: TContext,
): TValue;
function resolveValue<TContext, TValue>(
  value: CommandValue<TContext, TValue> | undefined,
  context: TContext,
): TValue | undefined;
function resolveValue<TContext, TValue>(
  value: CommandValue<TContext, TValue> | undefined,
  context: TContext,
): TValue | undefined {
  if (typeof value !== 'function') return value;
  return (value as (context: TContext) => TValue)(context);
}

function isVisible<TContext>(
  command: CommandDefinition<TContext>,
  entry: CommandMenuCommandEntry<TContext> | undefined,
  context: TContext,
) {
  return command.isVisible?.(context) !== false && entry?.isVisible?.(context) !== false;
}

function isEnabled<TContext>(
  command: CommandDefinition<TContext>,
  entry: CommandMenuCommandEntry<TContext> | undefined,
  context: TContext,
) {
  return command.isEnabled?.(context) !== false && entry?.isEnabled?.(context) !== false;
}

export function createCommandRegistry<TContext>(
  commands: Iterable<CommandDefinition<TContext>>,
): CommandRegistry<TContext> {
  return new Map([...commands].map((command) => [command.id, command]));
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
) {
  const command = registry.get(commandId);
  return Boolean(
    command?.run &&
    isVisible(command, undefined, context) &&
    isEnabled(command, undefined, context),
  );
}

export function executeCommand<TContext>(
  registry: CommandRegistry<TContext>,
  commandId: string,
  context: TContext,
) {
  const command = registry.get(commandId);
  if (!command || !canExecuteCommand(registry, commandId, context)) return false;

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
  entries,
  registry,
}: CommandMenuItemsInput<TContext>) {
  const items = entries.flatMap<CommandMenuItem>((entry) => {
    if (entry.type === 'separator') return [entry];

    const command = registry.get(entry.commandId);
    if (!command || !isVisible(command, entry, context)) return [];

    return [
      {
        commandId: command.id,
        danger: resolveValue(entry.danger ?? command.danger, context),
        disabled: !isEnabled(command, entry, context),
        icon: resolveValue(entry.icon ?? command.icon, context),
        id: entry.id ?? command.id,
        label: resolveValue<TContext, string>(entry.label ?? command.label, context),
        shortcut: resolveValue(entry.shortcut ?? command.shortcut, context),
        type: 'command',
      },
    ];
  });

  return compactCommandMenuItems(items);
}
