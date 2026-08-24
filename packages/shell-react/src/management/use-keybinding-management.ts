import { useLayoutEffect, useMemo, useState } from 'react';
import { createKeybindingManagementModel } from '@workbench-kit/platform';
import { createWorkbenchShellCommands } from '@workbench-kit/react/workbench';

import { useWorkbench, type WorkbenchContextValue } from '../shell/provider.js';
import { resolveShellCommandActivities } from '../workbench/command-palette.js';

export function useKeybindingManagementModel() {
  const {
    activities,
    commands,
    extensionCatalog,
    keybindings,
    keybindingEditingDisabledReason,
    keybindingOverrides,
    keybindingPlatform,
    keybindingProjection,
    resetCommandKeybindingOverride,
    setCommandKeybindingOverride,
    views,
  } = useWorkbench();

  const [keybindingRevision, setKeybindingRevision] = useState(() => keybindings.revision);
  useLayoutEffect(() => {
    const disposable = keybindings.onDidChangeKeybindings(() => {
      setKeybindingRevision(keybindings.revision);
    });
    setKeybindingRevision(keybindings.revision);

    return () => {
      disposable.dispose();
    };
  }, [keybindings]);
  const extensionDefaults = useMemo(
    () => keybindings.getKeybindings(),
    [keybindingRevision, keybindings],
  );
  const defaults = useMemo(() => {
    const projectedKeys = new Set(
      keybindingProjection.defaults.map((binding) => `${binding.command}\u0000${binding.key}`),
    );
    return [
      ...keybindingProjection.defaults,
      ...extensionDefaults.filter(
        (binding) => !projectedKeys.has(`${binding.command}\u0000${binding.key}`),
      ),
    ];
  }, [extensionDefaults, keybindingProjection.defaults]);

  const model = useMemo(
    () =>
      createKeybindingManagementModel({
        editingDisabledReason: keybindingEditingDisabledReason,
        onOverridesChange: () => undefined,
        overrides: keybindingOverrides,
        platform: keybindingPlatform,
        projection: {
          ...keybindingProjection,
          commands: collectKeybindingManagementCommands({
            activities,
            commands,
            extensionCatalog,
            views,
          }),
          defaults,
        },
      }),
    [
      activities,
      commands,
      defaults,
      extensionCatalog,
      keybindingEditingDisabledReason,
      keybindingOverrides,
      keybindingPlatform,
      keybindingProjection,
      views,
    ],
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
    editingDisabledReason: keybindingEditingDisabledReason,
    entries: model.entries,
    overrideCount,
    platform: keybindingPlatform,
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
