import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';

import { useWorkbench } from '../shell/provider.js';
import { useCommandRegistryCommandDescriptors } from './use-extension-registry-command-descriptors.js';

const EMPTY_COMMAND_DESCRIPTORS: readonly WorkbenchCommandDescriptor[] = [];

export function useWorkbenchCommandDescriptors(
  additionalCommands: readonly WorkbenchCommandDescriptor[] = EMPTY_COMMAND_DESCRIPTORS,
) {
  const { commands, extensionCatalog } = useWorkbench();
  return useCommandRegistryCommandDescriptors(
    commands,
    extensionCatalog.getFeatureSpecs(),
    additionalCommands,
  );
}
