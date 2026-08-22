import type { CommandDefinition } from '@workbench-kit/platform';
import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';
import type {
  WorkbenchShellCommandActivity,
  WorkbenchShellCommandContext,
} from '@workbench-kit/react/workbench';
import {
  filterActivitiesByWhenClause,
  type ExtensionCommandFeatureSpec,
  type ActivityRegistry,
  type ExtensionFeatureSpec,
  type ViewRegistry,
} from '@workbench-kit/workbench-core';
import type { CommandRegistry } from '@workbench-kit/platform';

type ExtensionCommand = ReturnType<CommandRegistry['getCommands']>[number];

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
  registries: { readonly activities: ActivityRegistry; readonly views: ViewRegistry },
  contextKeys?: object | undefined,
): WorkbenchShellCommandActivity[] {
  const activities = registries.activities.getActivities();
  if (activities.length > 0) {
    const visibleActivities =
      contextKeys === undefined
        ? activities
        : filterActivitiesByWhenClause(activities, contextKeys);

    return visibleActivities
      .map((activity) => ({
        icon: formatWorkbenchCommandIcon(activity.icon),
        id: activity.viewContainerId,
        label: `Show ${activity.title}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  const viewContainerIds = new Set(registries.views.getViews().map((view) => view.containerId));

  return [...viewContainerIds].map((containerId) => {
    const container = registries.views.getViewContainer(containerId);
    const firstView = registries.views.getViews(containerId)[0];

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

export function extensionCommandToDescriptor(
  command: ExtensionCommand,
  feature?: ExtensionCommandFeatureSpec | undefined,
): WorkbenchCommandDescriptor {
  const metadata = {
    argsSchema: feature?.argsSchema,
    chat: feature?.chat,
    requiresApproval: feature?.requiresApproval,
  };

  return {
    category: command.category ?? feature?.category,
    danger: feature?.danger,
    description: feature?.description,
    icon: resolveExtensionCommandIcon(command.icon),
    id: command.id,
    keywords: feature
      ? [feature.command, feature.title].filter((value) => value !== command.id)
      : undefined,
    label: command.title ?? feature?.title ?? command.id,
    metadata:
      metadata.argsSchema || metadata.chat || metadata.requiresApproval !== undefined
        ? metadata
        : undefined,
  };
}

export function collectExtensionCommandFeaturesById(
  featureSpecs: readonly ExtensionFeatureSpec[],
): ReadonlyMap<string, ExtensionCommandFeatureSpec> {
  return new Map(
    featureSpecs.flatMap((feature) =>
      feature.commands.map((command) => [command.id, command] as const),
    ),
  );
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
  extensionCommandFeaturesById,
  extensionCommands,
  shellCommands,
  shellContext,
}: {
  additionalCommands?: readonly WorkbenchCommandDescriptor[];
  extensionCommandFeaturesById?: ReadonlyMap<string, ExtensionCommandFeatureSpec> | undefined;
  extensionCommands: readonly ExtensionCommand[];
  shellCommands: readonly CommandDefinition<WorkbenchShellCommandContext>[];
  shellContext: WorkbenchShellCommandContext;
}): WorkbenchCommandDescriptor[] {
  const shellDescriptors = shellCommands.map((command) =>
    shellCommandDefinitionToDescriptor(command, shellContext),
  );
  const contributedDescriptors = extensionCommands.map((command) =>
    extensionCommandToDescriptor(command, extensionCommandFeaturesById?.get(command.id)),
  );

  return mergeWorkbenchCommandDescriptors(shellDescriptors, contributedDescriptors, [
    ...additionalCommands,
  ]);
}
