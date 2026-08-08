import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';
import type { ExtensionRegistry } from '@workbench-kit/workbench-core';
import { useEffect, useMemo, useReducer } from 'react';

import {
  collectExtensionCommandFeaturesById,
  extensionCommandToDescriptor,
  mergeWorkbenchCommandDescriptors,
} from '../workbench/command-palette.js';

const EMPTY_COMMAND_DESCRIPTORS: readonly WorkbenchCommandDescriptor[] = [];

/**
 * Resolves command descriptors from a host-owned registry without importing
 * WorkbenchProvider. Use this leaf hook when the host already owns the
 * canonical registry instance or when bundler context isolation matters.
 */
export function useExtensionRegistryCommandDescriptors(
  extensionRegistry: ExtensionRegistry,
  additionalCommands: readonly WorkbenchCommandDescriptor[] = EMPTY_COMMAND_DESCRIPTORS,
): readonly WorkbenchCommandDescriptor[] {
  const [refreshToken, refreshCommands] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const disposable = extensionRegistry.commands.onDidChangeCommands(() => {
      refreshCommands();
    });

    return () => {
      disposable.dispose();
    };
  }, [extensionRegistry.commands]);

  return useMemo(() => {
    const commandFeaturesById = collectExtensionCommandFeaturesById(extensionRegistry);

    return mergeWorkbenchCommandDescriptors(
      extensionRegistry.commands
        .getCommands()
        .map((command) =>
          extensionCommandToDescriptor(command, commandFeaturesById.get(command.id)),
        ),
      [...additionalCommands],
    );
  }, [additionalCommands, extensionRegistry, refreshToken]);
}
