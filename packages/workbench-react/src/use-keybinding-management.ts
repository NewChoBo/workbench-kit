import { useMemo } from 'react';
import {
  buildKeybindingManagementEntries,
  type KeybindingDefinition,
} from '@workbench-kit/platform';
import { createWorkbenchShellCommands } from '@workbench-kit/react/workbench';
import type { ExtensionRegistry } from '@workbench-kit/workbench-core';

import { useWorkbench } from './provider.js';
import { resolveShellCommandActivities } from './workbench-command-palette.js';

export function useKeybindingManagementModel() {
  const {
    extensionRegistry,
    keybindingOverrides,
    resetCommandKeybindingOverride,
    setCommandKeybindingOverride,
  } = useWorkbench();

  const defaults = useMemo(
    () => extensionRegistry.keybindings.getKeybindings(),
    [extensionRegistry, keybindingOverrides.length],
  );

  const entries = useMemo(
    () =>
      buildKeybindingManagementEntries({
        commands: collectKeybindingManagementCommands(extensionRegistry),
        defaults,
        overrides: keybindingOverrides,
      }),
    [defaults, extensionRegistry, keybindingOverrides],
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

function collectKeybindingManagementCommands(extensionRegistry: ExtensionRegistry) {
  const commands: Array<{
    category?: string | undefined;
    id: string;
    label: string;
    sourceLabel?: string | undefined;
  }> = [];
  const seen = new Set<string>();
  const shellCommands = createWorkbenchShellCommands({
    activities: resolveShellCommandActivities(extensionRegistry),
    includeSettings: true,
    includeSidebarToggle: true,
  });
  const shellCommandIds = new Set(shellCommands.map((command) => command.id));

  for (const extension of extensionRegistry.getExtensions()) {
    const extensionLabel = extension.manifest.displayName ?? extension.manifest.id;

    for (const contribution of extension.manifest.contributes?.commands ?? []) {
      const command = extensionRegistry.commands.getCommand(contribution.command);
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

  for (const command of extensionRegistry.commands.getCommands()) {
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

export function toKeybindingOverrideDefinitions(
  overrides: readonly KeybindingDefinition[],
): KeybindingDefinition[] {
  return overrides.map((binding) => ({ ...binding }));
}
