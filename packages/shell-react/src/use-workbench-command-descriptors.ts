import { useEffect, useMemo, useReducer } from 'react';
import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';

import { useWorkbench } from './provider.js';
import {
  collectExtensionCommandFeaturesById,
  extensionCommandToDescriptor,
  mergeWorkbenchCommandDescriptors,
} from './workbench-command-palette.js';

const EMPTY_COMMAND_DESCRIPTORS: readonly WorkbenchCommandDescriptor[] = [];

export function useWorkbenchCommandDescriptors(
  additionalCommands: readonly WorkbenchCommandDescriptor[] = EMPTY_COMMAND_DESCRIPTORS,
) {
  const { extensionRegistry } = useWorkbench();
  const [refreshToken, refreshCommands] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const disposable = extensionRegistry.commands.onDidRegisterCommand(() => {
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
