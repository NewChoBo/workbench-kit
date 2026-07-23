import {
  parseWorkbenchKeybindingsConfig,
  type WorkbenchKeybindingDefinition,
} from '@workbench-kit/workbench-config';
import {
  createBrowserWorkbenchStorage,
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core';

export const DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY = 'workbench-kit/.workbench/keybindings';

export function isWorkbenchKeybindingPersistenceAvailable(): boolean {
  return createBrowserWorkbenchStorage({ kind: 'local' }) !== undefined;
}

export function readPersistedKeybindingOverrides(
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): readonly WorkbenchKeybindingDefinition[] {
  const resolvedStorage = storage ?? createBrowserWorkbenchStorage({ kind: 'local' });
  if (!resolvedStorage) {
    return [];
  }

  try {
    const raw = resolvedStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    return parseWorkbenchKeybindingsConfig(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function writePersistedKeybindingOverrides(
  overrides: readonly WorkbenchKeybindingDefinition[],
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  const resolvedStorage = storage ?? createBrowserWorkbenchStorage({ kind: 'local' });
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(storageKey, JSON.stringify(overrides, null, 2));
}
