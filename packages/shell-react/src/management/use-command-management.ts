import { useEffect, useMemo, useReducer, useState } from 'react';
import type { ExtensionCommandFeatureSpec, ExtensionRegistry } from '@workbench-kit/workbench-core';
import {
  buildCommandManagementGroups,
  countCommandManagementEntries,
  type CommandManagementRunState,
} from '@workbench-kit/react/workbench/management';
import { createWorkbenchShellCommands } from '@workbench-kit/react/workbench';

import { useContextKeyRevision } from '../commands/use-context-key-revision.js';
import { useWorkbench } from '../shell/provider.js';
import {
  collectExtensionCommandFeaturesById,
  resolveShellCommandActivities,
} from '../workbench/command-palette.js';

export function useCommandManagementModel() {
  const { contextKeyService, executeCommand, extensionRegistry } = useWorkbench();
  const contextKeyRevision = useContextKeyRevision(contextKeyService);
  const contextKeySnapshot = useMemo(
    () => contextKeyService.createSnapshot(),
    [contextKeyRevision, contextKeyService],
  );
  const [lastRun, setLastRun] = useState<CommandManagementRunState | undefined>();
  const [refreshToken, refreshRegistry] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const commandDisposable = extensionRegistry.commands.onDidChangeCommands(() => {
      refreshRegistry();
    });

    return () => {
      commandDisposable.dispose();
    };
  }, [extensionRegistry]);

  const groups = useMemo(
    () => buildCommandManagementModelGroups(extensionRegistry, refreshToken, contextKeySnapshot),
    [contextKeySnapshot, extensionRegistry, refreshToken],
  );

  const totalCount = countCommandManagementEntries(groups);

  const runCommand = async (commandId: string) => {
    setLastRun({
      commandId,
      status: 'running',
      timestamp: Date.now(),
    });

    try {
      await executeCommand(commandId);
      setLastRun({
        commandId,
        status: 'success',
        timestamp: Date.now(),
      });
    } catch (error) {
      setLastRun({
        commandId,
        message: error instanceof Error ? error.message : 'Command failed.',
        status: 'error',
        timestamp: Date.now(),
      });
    }
  };

  return {
    groups,
    lastRun,
    refreshRegistry,
    runCommand,
    totalCount,
  };
}

export function buildCommandManagementModelGroups(
  extensionRegistry: ExtensionRegistry,
  _refreshToken = 0,
  contextKeys?: object | undefined,
) {
  const managedShellCommands = createWorkbenchShellCommands({
    activities: resolveShellCommandActivities(extensionRegistry),
    includeSettings: true,
    includeSidebarToggle: true,
  });
  const managedShellCommandIds = new Set(managedShellCommands.map((command) => command.id));
  const shellCommands =
    contextKeys === undefined
      ? managedShellCommands
      : createWorkbenchShellCommands({
          activities: resolveShellCommandActivities(extensionRegistry, contextKeys),
          includeSettings: true,
          includeSidebarToggle: true,
        });
  const commandFeaturesById = collectExtensionCommandFeaturesById(extensionRegistry);

  return buildCommandManagementGroups({
    extensionCommands: collectExtensionCommandEntries(
      extensionRegistry,
      managedShellCommandIds,
      commandFeaturesById,
    ),
    keybindingsByCommandId: collectKeybindingsByCommandId(extensionRegistry),
    menuSurfacesByCommandId: collectMenuSurfacesByCommandId(extensionRegistry),
    shellCommands: shellCommands.map((command) => ({
      category: command.category ?? 'Workbench',
      handler:
        extensionRegistry.commands.getCommand(command.id)?.handler ??
        command.handler ??
        command.run,
      id: command.id,
      label: typeof command.label === 'string' ? command.label : (command.title ?? command.id),
    })),
  });
}

function collectExtensionCommandEntries(
  extensionRegistry: ExtensionRegistry,
  skippedCommandIds: ReadonlySet<string>,
  commandFeaturesById: ReadonlyMap<string, ExtensionCommandFeatureSpec>,
) {
  const entries: Array<{
    category?: string | undefined;
    description?: string | undefined;
    extensionId: string;
    extensionLabel: string;
    handler?: unknown;
    id: string;
    label: string;
  }> = [];
  const seen = new Set<string>();

  for (const feature of extensionRegistry.getFeatureSpecs()) {
    const extensionLabel = feature.displayName;

    for (const contribution of feature.commands) {
      const command = extensionRegistry.commands.getCommand(contribution.id);
      if (!command || seen.has(contribution.id) || skippedCommandIds.has(contribution.id)) {
        continue;
      }

      seen.add(contribution.id);
      entries.push({
        category: command.category ?? contribution.category,
        description: contribution.description,
        extensionId: feature.id,
        extensionLabel,
        handler: command.handler,
        id: command.id,
        label: command.title ?? contribution.title ?? command.id,
      });
    }
  }

  for (const command of extensionRegistry.commands.getCommands()) {
    if (seen.has(command.id) || skippedCommandIds.has(command.id)) {
      continue;
    }

    entries.push({
      category: command.category,
      description: commandFeaturesById.get(command.id)?.description,
      extensionId: 'runtime',
      extensionLabel: 'Runtime',
      handler: command.handler,
      id: command.id,
      label: command.title ?? command.id,
    });
  }

  return entries;
}

function collectKeybindingsByCommandId(extensionRegistry: ExtensionRegistry) {
  const keybindingsByCommandId: Record<string, string> = {};

  for (const keybinding of extensionRegistry.keybindings.getKeybindings()) {
    if (!keybindingsByCommandId[keybinding.command]) {
      keybindingsByCommandId[keybinding.command] = keybinding.key;
    }
  }

  return keybindingsByCommandId;
}

function collectMenuSurfacesByCommandId(extensionRegistry: ExtensionRegistry) {
  const menuSurfacesByCommandId = new Map<string, Set<string>>();

  for (const menuItem of extensionRegistry.menus.getMenuItems()) {
    if (!menuItem.menu || !menuItem.command) {
      continue;
    }

    const surfaces = menuSurfacesByCommandId.get(menuItem.command) ?? new Set<string>();
    surfaces.add(menuItem.menu);
    menuSurfacesByCommandId.set(menuItem.command, surfaces);
  }

  return Object.fromEntries(
    [...menuSurfacesByCommandId.entries()].map(([commandId, surfaces]) => [
      commandId,
      [...surfaces].sort(),
    ]),
  );
}
