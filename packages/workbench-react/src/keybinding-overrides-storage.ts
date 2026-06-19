import {
  parseWorkbenchKeybindingsConfig,
  type WorkbenchKeybindingDefinition,
} from '@workbench-kit/workbench-config';

export const DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY = 'workbench-kit/.workbench/keybindings';

export function isWorkbenchKeybindingPersistenceAvailable(): boolean {
  try {
    return typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readPersistedKeybindingOverrides(
  storageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  storage?: Pick<Storage, 'getItem'>,
): readonly WorkbenchKeybindingDefinition[] {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
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
  storage?: Pick<Storage, 'setItem'>,
): void {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(storageKey, JSON.stringify(overrides, null, 2));
}

function getBrowserLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
