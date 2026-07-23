import {
  parseWorkbenchSettingsConfig,
  type WorkbenchSettingsConfig,
} from '@workbench-kit/workbench-config';
import {
  createBrowserWorkbenchStorage,
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core';

export const DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY =
  'workbench-kit/.workbench/settings.local';

export function isWorkbenchLocalPreferencePersistenceAvailable(): boolean {
  return createBrowserWorkbenchStorage({ kind: 'local' }) !== undefined;
}

export function readPersistedLocalPreferences(
  storageKey = DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): WorkbenchSettingsConfig {
  const resolvedStorage = storage ?? createBrowserWorkbenchStorage({ kind: 'local' });
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
  const resolvedStorage = storage ?? createBrowserWorkbenchStorage({ kind: 'local' });
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(storageKey, JSON.stringify(values, null, 2));
}
