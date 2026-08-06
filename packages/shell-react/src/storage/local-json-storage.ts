import {
  createBrowserWorkbenchStorage,
  type WorkbenchStorageAdapter,
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core';

export function resolveLocalWorkbenchStorage<
  TStorage extends WorkbenchStorageReader | WorkbenchStorageWriter = WorkbenchStorageAdapter,
>(storage?: TStorage): TStorage | WorkbenchStorageAdapter | undefined {
  return storage ?? createBrowserWorkbenchStorage({ kind: 'local' });
}

export function readLocalJsonStorage<T>(
  storageKey: string,
  parse: (value: unknown) => T,
  fallback: () => T,
  storage?: WorkbenchStorageReader,
): T {
  const resolvedStorage = resolveLocalWorkbenchStorage(storage);
  if (!resolvedStorage) {
    return fallback();
  }

  try {
    const raw = resolvedStorage.getItem(storageKey);
    if (!raw) {
      return fallback();
    }

    return parse(JSON.parse(raw) as unknown);
  } catch {
    return fallback();
  }
}

export function writeLocalJsonStorage<T>(
  storageKey: string,
  value: T,
  storage?: WorkbenchStorageWriter,
  options: {
    readonly errorMode?: 'ignore' | 'throw';
    readonly toStorageValue?: (value: T) => unknown;
  } = {},
): void {
  const resolvedStorage = resolveLocalWorkbenchStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.setItem(
      storageKey,
      JSON.stringify((options.toStorageValue ?? identity)(value), null, 2),
    );
  } catch (error) {
    if (options.errorMode === 'throw') {
      throw error;
    }
    // Local storage is best-effort; quota, security, and serialization errors stay non-fatal.
  }
}

function identity<T>(value: T): T {
  return value;
}
