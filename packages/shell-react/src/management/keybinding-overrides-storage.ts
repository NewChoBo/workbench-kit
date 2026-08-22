import {
  parseWorkbenchKeybindingsConfig,
  type WorkbenchKeybindingDefinition,
} from '@workbench-kit/workbench-config';
import {
  type WorkbenchPersistenceDiagnosticOptions,
  type WorkbenchPersistenceReadResult,
  type WorkbenchPersistenceWriteResult,
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core';

import {
  readLocalJsonStorage,
  readLocalJsonStorageResult,
  resolveLocalWorkbenchStorage,
  writeLocalJsonStorage,
  writeLocalJsonStorageResult,
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

export function readPersistedKeybindingOverridesResult(
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceReadResult<readonly WorkbenchKeybindingDefinition[]> {
  return readLocalJsonStorageResult(
    storageKey,
    parseWorkbenchKeybindingsConfig,
    () => [],
    storage,
    options,
  );
}

export function writePersistedKeybindingOverrides(
  overrides: readonly WorkbenchKeybindingDefinition[],
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  writeLocalJsonStorage(storageKey, overrides, storage, { errorMode: 'throw' });
}

export function writePersistedKeybindingOverridesResult(
  overrides: readonly WorkbenchKeybindingDefinition[],
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceWriteResult {
  return writeLocalJsonStorageResult(storageKey, overrides, storage, options);
}
