import type { CommandDefinition } from '@workbench-kit/platform';
import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';
import type {
  WorkbenchShellCommandActivity,
  WorkbenchShellCommandContext,
} from '@workbench-kit/react/workbench';
import type { ExtensionRegistry } from '@workbench-kit/workbench-core';

export const WORKBENCH_COMMAND_PALETTE_SHORTCUT = 'Ctrl+Shift+P';

type ExtensionCommand = ReturnType<ExtensionRegistry['commands']['getCommands']>[number];

function resolveCommandValue<TContext, TValue>(
  value: CommandDefinition<TContext>[keyof CommandDefinition<TContext>],
  context: TContext,
): TValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'function') {
    return (value as (ctx: TContext) => TValue)(context);
  }

  return value as TValue;
}

export function formatWorkbenchCommandIcon(icon: string | undefined): string | undefined {
  if (!icon) {
    return undefined;
  }

  return icon.startsWith('codicon-') ? icon : `codicon-${icon}`;
}

export function resolveExtensionCommandIcon(icon: ExtensionCommand['icon']): string | undefined {
  if (typeof icon === 'function') {
    return formatWorkbenchCommandIcon(icon(undefined as void));
  }

  return formatWorkbenchCommandIcon(icon);
}

export function resolveShellCommandActivities(
  extensionRegistry: ExtensionRegistry,
): WorkbenchShellCommandActivity[] {
  const activities = extensionRegistry.activities.getActivities();
  if (activities.length > 0) {
    return activities
      .map((activity) => ({
        icon: formatWorkbenchCommandIcon(activity.icon),
        id: activity.viewContainerId,
        label: `Show ${activity.title}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  const viewContainerIds = new Set(
    extensionRegistry.views.getViews().map((view) => view.containerId),
  );

  return [...viewContainerIds].map((containerId) => {
    const container = extensionRegistry.views.getViewContainer(containerId);
    const firstView = extensionRegistry.views.getViews(containerId)[0];

    return {
      icon: formatWorkbenchCommandIcon(container?.icon ?? 'files'),
      id: containerId,
      label: `Show ${container?.title ?? firstView?.name ?? containerId}`,
    };
  });
}

export function shellCommandDefinitionToDescriptor<TContext>(
  command: CommandDefinition<TContext>,
  context: TContext,
): WorkbenchCommandDescriptor {
  const label =
    resolveCommandValue<TContext, string>(command.label, context) ?? command.title ?? command.id;
  const disabled = command.isEnabled ? !command.isEnabled(context) : false;

  return {
    category: command.category ?? 'View',
    icon: formatWorkbenchCommandIcon(resolveCommandValue(command.icon, context)),
    id: command.id,
    label,
    shortcut: resolveCommandValue(command.shortcut, context),
    disabled,
  };
}

export function extensionCommandToDescriptor(command: ExtensionCommand): WorkbenchCommandDescriptor | undefined {
  if (!command.handler) {
    return undefined;
  }

  return {
    category: command.category,
    icon: resolveExtensionCommandIcon(command.icon),
    id: command.id,
    label: command.title ?? command.id,
  };
}

export function mergeWorkbenchCommandDescriptors(
  ...groups: readonly WorkbenchCommandDescriptor[][]
): WorkbenchCommandDescriptor[] {
  const seen = new Set<string>();

  return groups.flat().filter((command) => {
    if (seen.has(command.id)) {
      return false;
    }

    seen.add(command.id);
    return true;
  });
}

export function buildWorkbenchPaletteCommands({
  additionalCommands = [],
  extensionCommands,
  shellCommands,
  shellContext,
}: {
  additionalCommands?: readonly WorkbenchCommandDescriptor[];
  extensionCommands: readonly ExtensionCommand[];
  shellCommands: readonly CommandDefinition<WorkbenchShellCommandContext>[];
  shellContext: WorkbenchShellCommandContext;
}): WorkbenchCommandDescriptor[] {
  const shellDescriptors = shellCommands.map((command) =>
    shellCommandDefinitionToDescriptor(command, shellContext),
  );
  const contributedDescriptors = extensionCommands
    .map((command) => extensionCommandToDescriptor(command))
    .filter((command): command is WorkbenchCommandDescriptor => command !== undefined);

  return mergeWorkbenchCommandDescriptors(shellDescriptors, contributedDescriptors, [
    ...additionalCommands,
  ]);
}

export function matchesWorkbenchCommandPaletteShortcut(event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>) {
  const key = event.key.toLowerCase();

  if (key !== 'p') {
    return false;
  }

  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey) {
    return false;
  }

  return true;
}
