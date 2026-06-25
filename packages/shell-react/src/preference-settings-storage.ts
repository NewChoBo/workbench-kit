import {
  parseWorkbenchSettingsConfig,
  type WorkbenchSettingsConfig,
} from '@workbench-kit/workbench-config';
import type { WorkbenchStorageReader, WorkbenchStorageWriter } from '@workbench-kit/workbench-core';

export const DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY =
  'workbench-kit/.workbench/settings.local';

export function isWorkbenchLocalPreferencePersistenceAvailable(): boolean {
  try {
    return typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readPersistedLocalPreferences(
  storageKey = DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): WorkbenchSettingsConfig {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return {};
  }

  try {
    const raw = resolvedStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }

    return parseWorkbenchSettingsConfig(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function writePersistedLocalPreferences(
  values: WorkbenchSettingsConfig,
  storageKey = DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(storageKey, JSON.stringify(values, null, 2));
}

function getBrowserLocalStorage(): (WorkbenchStorageReader & WorkbenchStorageWriter) | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
