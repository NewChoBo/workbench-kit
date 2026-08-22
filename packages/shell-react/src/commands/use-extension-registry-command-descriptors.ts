import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';
import type { CommandRegistry } from '@workbench-kit/platform';
import type { ExtensionFeatureSpec, ExtensionRegistry } from '@workbench-kit/workbench-core';
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
  return useCommandRegistryCommandDescriptors(
    extensionRegistry.commands,
    extensionRegistry.getFeatureSpecs(),
    additionalCommands,
  );
}

export function useCommandRegistryCommandDescriptors(
  commands: CommandRegistry,
  featureSpecs: readonly ExtensionFeatureSpec[],
  additionalCommands: readonly WorkbenchCommandDescriptor[] = EMPTY_COMMAND_DESCRIPTORS,
): readonly WorkbenchCommandDescriptor[] {
  const [refreshToken, refreshCommands] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const disposable = commands.onDidChangeCommands(() => {
      refreshCommands();
    });
    // A host may register commands in a layout effect after this hook rendered
    // but before its passive subscription was installed. Re-read once after
    // subscribing so that transition cannot leave the memoized snapshot stale.
    refreshCommands();

    return () => {
      disposable.dispose();
    };
  }, [commands]);

  return useMemo(() => {
    const commandFeaturesById = collectExtensionCommandFeaturesById(featureSpecs);

    return mergeWorkbenchCommandDescriptors(
      commands
        .getCommands()
        .map((command) =>
          extensionCommandToDescriptor(command, commandFeaturesById.get(command.id)),
        ),
      [...additionalCommands],
    );
  }, [additionalCommands, commands, featureSpecs, refreshToken]);
}
