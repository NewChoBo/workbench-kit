import {
  parseWorkbenchSettingsConfig,
  type WorkbenchSettingsConfig,
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

export const DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY =
  'workbench-kit/.workbench/settings.local';

export function isWorkbenchLocalPreferencePersistenceAvailable(): boolean {
  return resolveLocalWorkbenchStorage() !== undefined;
}

export function readPersistedLocalPreferences(
  storageKey = DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): WorkbenchSettingsConfig {
  return readLocalJsonStorage(storageKey, parseWorkbenchSettingsConfig, () => ({}), storage);
}

export function readPersistedLocalPreferencesResult(
  storageKey = DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceReadResult<WorkbenchSettingsConfig> {
  return readLocalJsonStorageResult(
    storageKey,
    parseWorkbenchSettingsConfig,
    () => ({}),
    storage,
    options,
  );
}

export function writePersistedLocalPreferences(
  values: WorkbenchSettingsConfig,
  storageKey = DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  writeLocalJsonStorage(storageKey, values, storage, { errorMode: 'throw' });
}

export function writePersistedLocalPreferencesResult(
  values: WorkbenchSettingsConfig,
  storageKey = DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceWriteResult {
  return writeLocalJsonStorageResult(storageKey, values, storage, options);
}
