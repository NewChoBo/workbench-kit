import { useMemo } from 'react';
import { buildKeybindingManagementEntries } from '@workbench-kit/platform';
import { createWorkbenchShellCommands } from '@workbench-kit/react/workbench';

import { useWorkbench, type WorkbenchContextValue } from '../shell/provider.js';
import { resolveShellCommandActivities } from '../workbench/command-palette.js';

export function useKeybindingManagementModel() {
  const {
    activities,
    commands,
    extensionCatalog,
    keybindings,
    keybindingOverrides,
    resetCommandKeybindingOverride,
    setCommandKeybindingOverride,
    views,
  } = useWorkbench();

  const defaults = useMemo(
    () => keybindings.getKeybindings(),
    [keybindingOverrides.length, keybindings],
  );

  const entries = useMemo(
    () =>
      buildKeybindingManagementEntries({
        commands: collectKeybindingManagementCommands({
          activities,
          commands,
          extensionCatalog,
          views,
        }),
        defaults,
        overrides: keybindingOverrides,
      }),
    [activities, commands, defaults, extensionCatalog, keybindingOverrides, views],
  );

  const overrideCount = keybindingOverrides.length;

  const setKeybinding = (commandId: string, key: string | undefined) => {
    const defaultKey = defaults.find((binding) => binding.command === commandId)?.key;
    if (!key || key === defaultKey) {
      resetCommandKeybindingOverride(commandId);
      return;
    }

    setCommandKeybindingOverride(commandId, key);
  };

  return {
    entries,
    overrideCount,
    resetKeybinding: resetCommandKeybindingOverride,
    setKeybinding,
  };
}

function collectKeybindingManagementCommands(access: KeybindingManagementAccess) {
  const commands: Array<{
    category?: string | undefined;
    id: string;
    label: string;
    sourceLabel?: string | undefined;
  }> = [];
  const seen = new Set<string>();
  const shellCommands = createWorkbenchShellCommands({
    activities: resolveShellCommandActivities(access),
    includeSettings: true,
    includeSidebarToggle: true,
  });
  const shellCommandIds = new Set(shellCommands.map((command) => command.id));

  for (const extension of access.extensionCatalog.getExtensions()) {
    const extensionLabel = extension.manifest.displayName ?? extension.manifest.id;

    for (const contribution of extension.manifest.contributes?.commands ?? []) {
      const command = access.commands.getCommand(contribution.command);
      if (!command || seen.has(contribution.command) || shellCommandIds.has(contribution.command)) {
        continue;
      }

      seen.add(contribution.command);
      commands.push({
        category: command.category ?? contribution.category,
        id: command.id,
        label: command.title ?? contribution.title ?? command.id,
        sourceLabel: extensionLabel,
      });
    }
  }

  for (const command of access.commands.getCommands()) {
    if (seen.has(command.id) || shellCommandIds.has(command.id)) {
      continue;
    }

    commands.push({
      category: command.category,
      id: command.id,
      label: command.title ?? command.id,
      sourceLabel: 'Runtime',
    });
  }

  for (const command of shellCommands) {
    if (seen.has(command.id)) {
      continue;
    }

    const label =
      typeof command.label === 'function'
        ? command.id
        : typeof command.label === 'string'
          ? command.label
          : command.id;

    seen.add(command.id);
    commands.push({
      category: 'Workbench',
      id: command.id,
      label,
      sourceLabel: 'Workbench Shell',
    });
  }

  return commands;
}

type KeybindingManagementAccess = Pick<
  WorkbenchContextValue,
  'activities' | 'commands' | 'extensionCatalog' | 'views'
>;
