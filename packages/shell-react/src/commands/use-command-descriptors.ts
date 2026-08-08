import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';

import { useWorkbench } from '../shell/provider.js';
import { useExtensionRegistryCommandDescriptors } from './use-extension-registry-command-descriptors.js';

const EMPTY_COMMAND_DESCRIPTORS: readonly WorkbenchCommandDescriptor[] = [];

export function useWorkbenchCommandDescriptors(
  additionalCommands: readonly WorkbenchCommandDescriptor[] = EMPTY_COMMAND_DESCRIPTORS,
) {
  const { extensionRegistry } = useWorkbench();
  return useExtensionRegistryCommandDescriptors(extensionRegistry, additionalCommands);
}
