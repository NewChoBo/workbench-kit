import type { CommandMenuItem, ResolvedCommandMenuCommandItem } from '@workbench-kit/platform';

import { getWorkbenchStatusLabel, isWorkbenchStatusDisabled, type WorkbenchStatus } from './status';

export type WorkbenchCommandStatus = WorkbenchStatus;

export interface WorkbenchCommandExecution {
  kind: 'agent' | 'local' | 'remote' | 'composite' | (string & {});
  label?: string | undefined;
}

export type WorkbenchCommandFeedback = 'none' | 'status' | 'timeline';
export type WorkbenchCommandOutput = 'none' | 'message' | 'event' | 'artifact';
export type WorkbenchCommandSideEffect = 'none' | 'workspace-write' | 'external-write';
export type WorkbenchCommandRunSource = 'grouped-list' | 'list' | 'palette' | 'suggest';
export type WorkbenchCommandGroupBy =
  | 'category'
  | 'danger'
  | 'execution'
  | 'feedback'
  | 'keyword'
  | 'output'
  | 'sideEffect'
  | 'status';

export interface WorkbenchCommandDescriptor {
  category?: string | undefined;
  danger?: boolean | undefined;
  description?: string | undefined;
  disabled?: boolean | undefined;
  disabledReason?: string | undefined;
  execution?: WorkbenchCommandExecution | undefined;
  feedback?: WorkbenchCommandFeedback | undefined;
  icon?: string | undefined;
  id: string;
  keywords?: readonly string[] | undefined;
  label: string;
  metadata?: Record<string, unknown> | undefined;
  output?: WorkbenchCommandOutput | undefined;
  shortcut?: string | undefined;
  sideEffect?: WorkbenchCommandSideEffect | undefined;
  status?: WorkbenchCommandStatus | undefined;
}

export interface WorkbenchCommandRunContext {
  groupId?: string | undefined;
  groupLabel?: string | undefined;
  index: number;
  query: string;
  source: WorkbenchCommandRunSource;
}

export interface WorkbenchCommandFilterInput {
  commands: readonly WorkbenchCommandDescriptor[];
  limit?: number | undefined;
  query?: string | undefined;
}

export interface WorkbenchCommandNavigationInput {
  commands: readonly WorkbenchCommandDescriptor[];
  currentIndex: number;
  direction: 'next' | 'previous';
}

export interface WorkbenchCommandGroup {
  commands: readonly WorkbenchCommandDescriptor[];
  id: string;
  label: string;
}

export interface WorkbenchCommandGroupingInput {
  commands: readonly WorkbenchCommandDescriptor[];
  fallbackGroupLabel?: string | undefined;
  groupBy?: WorkbenchCommandGroupBy | undefined;
}

export type WorkbenchCommandDescriptorOverrides = Partial<
  Omit<WorkbenchCommandDescriptor, 'danger' | 'disabled' | 'icon' | 'id' | 'label' | 'shortcut'>
>;

const commandExecutionLabels: Record<string, string> = {
  agent: 'Agent',
  composite: 'Composite',
  local: 'Local',
  remote: 'Remote',
};

const commandFeedbackLabels: Record<WorkbenchCommandFeedback, string> = {
  none: 'No feedback',
  status: 'Status',
  timeline: 'Timeline',
};

const commandOutputLabels: Record<WorkbenchCommandOutput, string> = {
  artifact: 'Artifact',
  event: 'Event',
  message: 'Message',
  none: 'No output',
};

const commandSideEffectLabels: Record<WorkbenchCommandSideEffect, string> = {
  'external-write': 'External write',
  none: 'No side effect',
  'workspace-write': 'Workspace write',
};

function normalizedSearchText(value: string) {
  return value.trim().toLocaleLowerCase();
}

function commandSearchText(command: WorkbenchCommandDescriptor) {
  return normalizedSearchText(
    [
      command.id,
      command.label,
      command.description,
      command.category,
      command.shortcut,
      ...(command.keywords ?? []),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

export function normalizeWorkbenchCommandQuery(query = '') {
  const trimmed = query.trimStart();

  return trimmed.startsWith('>') ? trimmed.slice(1).trimStart() : query;
}

export function getWorkbenchCommandStatusLabel(status: WorkbenchCommandStatus) {
  return getWorkbenchStatusLabel(status);
}

export function getWorkbenchCommandExecutionLabel(execution: WorkbenchCommandExecution) {
  return execution.label ?? commandExecutionLabels[execution.kind] ?? execution.kind;
}

export function isWorkbenchCommandRunnable(command: WorkbenchCommandDescriptor) {
  return !(command.disabled || (command.status && isWorkbenchStatusDisabled(command.status)));
}

function normalizeWorkbenchCommandGroupId(label: string) {
  const normalized = normalizedSearchText(label)
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'group';
}

function getWorkbenchCommandGroupLabels({
  command,
  fallbackGroupLabel,
  groupBy = 'category',
}: {
  command: WorkbenchCommandDescriptor;
  fallbackGroupLabel: string;
  groupBy?: WorkbenchCommandGroupBy | undefined;
}) {
  if (groupBy === 'keyword') {
    return command.keywords?.length ? [...command.keywords] : [fallbackGroupLabel];
  }

  if (groupBy === 'category') return [command.category ?? fallbackGroupLabel];
  if (groupBy === 'danger') return [command.danger ? 'Danger' : 'Default'];
  if (groupBy === 'execution') {
    return [
      command.execution ? getWorkbenchCommandExecutionLabel(command.execution) : fallbackGroupLabel,
    ];
  }
  if (groupBy === 'feedback')
    return [command.feedback ? commandFeedbackLabels[command.feedback] : fallbackGroupLabel];
  if (groupBy === 'output')
    return [command.output ? commandOutputLabels[command.output] : fallbackGroupLabel];
  if (groupBy === 'sideEffect') {
    return [command.sideEffect ? commandSideEffectLabels[command.sideEffect] : fallbackGroupLabel];
  }

  const status = command.status ?? (command.disabled ? 'disabled' : undefined);
  return [status ? getWorkbenchCommandStatusLabel(status) : fallbackGroupLabel];
}

export function groupWorkbenchCommands({
  commands,
  fallbackGroupLabel = 'Other',
  groupBy = 'category',
}: WorkbenchCommandGroupingInput): WorkbenchCommandGroup[] {
  const groups = new Map<string, { commands: WorkbenchCommandDescriptor[]; label: string }>();

  commands.forEach((command) => {
    getWorkbenchCommandGroupLabels({ command, fallbackGroupLabel, groupBy }).forEach((label) => {
      const id = normalizeWorkbenchCommandGroupId(`${groupBy}-${label}`);
      const group = groups.get(id) ?? { commands: [], label };

      group.commands.push(command);
      groups.set(id, group);
    });
  });

  return Array.from(groups, ([id, group]) => ({
    commands: group.commands,
    id,
    label: group.label,
  }));
}

export function filterWorkbenchCommands({
  commands,
  limit,
  query = '',
}: WorkbenchCommandFilterInput) {
  const tokens = normalizedSearchText(normalizeWorkbenchCommandQuery(query))
    .split(/\s+/)
    .filter(Boolean);
  const filtered = tokens.length
    ? commands.filter((command) => {
        const searchText = commandSearchText(command);
        return tokens.every((token) => searchText.includes(token));
      })
    : [...commands];

  return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
}

export function getNextWorkbenchCommandIndex({
  commands,
  currentIndex,
  direction,
}: WorkbenchCommandNavigationInput) {
  if (commands.length === 0) return -1;

  const step = direction === 'next' ? 1 : -1;
  const startIndex =
    currentIndex >= 0 && currentIndex < commands.length
      ? currentIndex
      : direction === 'next'
        ? -1
        : 0;

  for (let offset = 1; offset <= commands.length; offset += 1) {
    const nextIndex = (startIndex + step * offset + commands.length) % commands.length;
    const command = commands[nextIndex];
    if (command && isWorkbenchCommandRunnable(command)) return nextIndex;
  }

  return -1;
}

export function commandMenuItemToWorkbenchCommandDescriptor(
  item: ResolvedCommandMenuCommandItem,
  overrides: WorkbenchCommandDescriptorOverrides = {},
): WorkbenchCommandDescriptor {
  const metadata = {
    menuItemId: item.id,
    ...overrides.metadata,
  };

  return {
    ...overrides,
    danger: item.danger,
    disabled: item.disabled,
    icon: item.icon,
    id: item.commandId,
    label: item.label,
    metadata,
    shortcut: item.shortcut,
  };
}

export function commandMenuItemsToWorkbenchCommandDescriptors(
  items: readonly CommandMenuItem[],
  overridesByCommandId: Record<string, WorkbenchCommandDescriptorOverrides> = {},
) {
  return items.flatMap((item) =>
    item.type === 'command'
      ? [commandMenuItemToWorkbenchCommandDescriptor(item, overridesByCommandId[item.commandId])]
      : [],
  );
}
