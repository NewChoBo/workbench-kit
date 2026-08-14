import {
  createBrowserWorkbenchStorage,
  readWorkbenchStorageJsonResult,
  writeWorkbenchStorageJsonResult,
  type WorkbenchPersistenceDiagnosticOptions,
  type WorkbenchPersistenceReadResult,
  type WorkbenchPersistenceWriteResult,
  type WorkbenchStorageAdapter,
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core';

export interface WriteLocalJsonStorageOptions<T> extends WorkbenchPersistenceDiagnosticOptions {
  readonly errorMode?: 'ignore' | 'throw';
  readonly toStorageValue?: (value: T) => unknown;
}

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
  options: WorkbenchPersistenceDiagnosticOptions = {},
): T {
  return readLocalJsonStorageResult(storageKey, parse, fallback, storage, options).value;
}

export function readLocalJsonStorageResult<T>(
  storageKey: string,
  parse: (value: unknown) => T,
  fallback: () => T,
  storage?: WorkbenchStorageReader,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceReadResult<T> {
  return readWorkbenchStorageJsonResult(storageKey, parse, fallback, storage, options);
}

export function writeLocalJsonStorage<T>(
  storageKey: string,
  value: T,
  storage?: WorkbenchStorageWriter,
  options: WriteLocalJsonStorageOptions<T> = {},
): void {
  if (options.errorMode !== 'throw') {
    writeLocalJsonStorageResult(storageKey, value, storage, options);
    return;
  }

  const resolvedStorage = resolveLocalWorkbenchStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(
    storageKey,
    JSON.stringify((options.toStorageValue ?? identity)(value), null, 2),
  );
}

export function writeLocalJsonStorageResult<T>(
  storageKey: string,
  value: T,
  storage?: WorkbenchStorageWriter,
  options: WriteLocalJsonStorageOptions<T> = {},
): WorkbenchPersistenceWriteResult {
  return writeWorkbenchStorageJsonResult(storageKey, value, storage, {
    onDiagnostic: options.onDiagnostic,
    toStorageValue: options.toStorageValue,
  });
}

function identity<T>(value: T): T {
  return value;
}
