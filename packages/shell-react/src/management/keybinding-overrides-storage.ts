import {
  parseWorkbenchKeybindingsConfig,
  type WorkbenchKeybindingDefinition,
} from '@workbench-kit/workbench-config';
import {
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core';

import {
  readLocalJsonStorage,
  resolveLocalWorkbenchStorage,
  writeLocalJsonStorage,
} from '../storage/local-json-storage.js';

export const DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY = 'workbench-kit/.workbench/keybindings';

export function isWorkbenchKeybindingPersistenceAvailable(): boolean {
  return resolveLocalWorkbenchStorage() !== undefined;
}

export function readPersistedKeybindingOverrides(
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): readonly WorkbenchKeybindingDefinition[] {
  return readLocalJsonStorage(storageKey, parseWorkbenchKeybindingsConfig, () => [], storage);
}

export function writePersistedKeybindingOverrides(
  overrides: readonly WorkbenchKeybindingDefinition[],
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  writeLocalJsonStorage(storageKey, overrides, storage, { errorMode: 'throw' });
}
