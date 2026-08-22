import type {
  WorkbenchPersistenceDiagnostic,
  WorkbenchPersistenceDiagnosticCode,
  WorkbenchPersistenceDiagnosticHandler,
  WorkbenchPersistenceReadResult,
  WorkbenchPersistenceWriteResult,
  WorkbenchRemovableStorageAdapter,
  WorkbenchStorageAdapter,
  WorkbenchStorageReader,
  WorkbenchStorageWriter,
} from './storage.js';

/**
 * Process-memory storage for tests and ephemeral hosts.
 * Never writes to `localStorage` / `sessionStorage`.
 */
export function createMemoryWorkbenchStorage(): WorkbenchRemovableStorageAdapter {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

export type BrowserWorkbenchStorageKind = 'local' | 'session';

export interface CreateBrowserWorkbenchStorageOptions {
  /** Defaults to `local`. */
  readonly kind?: BrowserWorkbenchStorageKind | undefined;
  /** Injected `Storage` (tests). Defaults to `localStorage` / `sessionStorage`. */
  readonly storage?: Storage | undefined;
}

export interface WorkbenchPersistenceDiagnosticOptions {
  readonly onDiagnostic?: WorkbenchPersistenceDiagnosticHandler | undefined;
}

export interface WriteWorkbenchStorageJsonResultOptions<
  T,
> extends WorkbenchPersistenceDiagnosticOptions {
  readonly toStorageValue?: ((value: T) => unknown) | undefined;
}

/**
 * Wraps browser `localStorage` or `sessionStorage` as a removable adapter.
 * Returns `undefined` when the chosen web storage is unavailable.
 *
 * Do not store secrets here — use `createMemorySecretStorage` / vault.
 */
export function createBrowserWorkbenchStorage(
  options: CreateBrowserWorkbenchStorageOptions = {},
): WorkbenchRemovableStorageAdapter | undefined {
  if (options.storage) {
    return createBrowserStorageAdapter(options.storage);
  }

  const resolution = getBrowserStorage(options.kind ?? 'local');
  return resolution.status === 'available'
    ? createBrowserStorageAdapter(resolution.storage)
    : undefined;
}

export function readWorkbenchStorageJsonResult<T>(
  storageKey: string,
  parse: (value: unknown) => T,
  fallback: () => T,
  storage?: WorkbenchStorageReader,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceReadResult<T> {
  const resolution = resolveWorkbenchStorage(storage);
  if (resolution.status !== 'available') {
    return resolution.status === 'failed'
      ? createReadFailureResult(storageKey, 'read_failed', fallback, options.onDiagnostic)
      : { value: fallback() };
  }

  let raw: string | null;
  try {
    raw = resolution.storage.getItem(storageKey);
  } catch {
    return createReadFailureResult(storageKey, 'read_failed', fallback, options.onDiagnostic);
  }

  if (raw === null) {
    return { value: fallback() };
  }

  try {
    return { value: parse(JSON.parse(raw) as unknown) };
  } catch {
    return createReadFailureResult(storageKey, 'decode_failed', fallback, options.onDiagnostic);
  }
}

export function readWorkbenchStorageArrayResult<T>(
  storageKey: string,
  normalize: (value: unknown) => T | undefined,
  storage?: WorkbenchStorageReader,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceReadResult<T[]> {
  return readWorkbenchStorageJsonResult(
    storageKey,
    (value) => {
      if (!Array.isArray(value)) {
        throw new TypeError('Expected an array storage value.');
      }

      return value.flatMap((entry) => {
        const normalized = normalize(entry);
        return normalized === undefined ? [] : [normalized];
      });
    },
    () => [],
    storage,
    options,
  );
}

export function readWorkbenchStorageArray<T>(
  storageKey: string,
  normalize: (value: unknown) => T | undefined,
  storage?: WorkbenchStorageReader,
): T[] {
  return readWorkbenchStorageArrayResult(storageKey, normalize, storage).value;
}

/**
 * Strict compatibility writer used by existing public save helpers.
 * Storage and serialization failures continue to throw.
 */
export function writeWorkbenchStorageJson(
  storageKey: string,
  value: unknown,
  storage?: WorkbenchStorageWriter,
): void {
  const resolvedStorage = storage ?? createBrowserWorkbenchStorage({ kind: 'local' });
  resolvedStorage?.setItem(storageKey, JSON.stringify(value, null, 2));
}

export function writeWorkbenchStorageJsonResult<T>(
  storageKey: string,
  value: T,
  storage?: WorkbenchStorageWriter,
  options: WriteWorkbenchStorageJsonResultOptions<T> = {},
): WorkbenchPersistenceWriteResult {
  const resolution = resolveWorkbenchStorage(storage);
  if (resolution.status !== 'available') {
    return createWriteFailureResult(storageKey, options.onDiagnostic);
  }

  try {
    const storageValue = (options.toStorageValue ?? identity)(value);
    const serialized = JSON.stringify(storageValue, null, 2);
    if (serialized === undefined) {
      return createWriteFailureResult(storageKey, options.onDiagnostic);
    }
    resolution.storage.setItem(storageKey, serialized);
    return { committed: true };
  } catch {
    return createWriteFailureResult(storageKey, options.onDiagnostic);
  }
}

type BrowserStorageResolution =
  | { readonly status: 'available'; readonly storage: Storage }
  | { readonly status: 'failed' | 'unavailable' };

type WorkbenchStorageResolution<TStorage> =
  | { readonly status: 'available'; readonly storage: TStorage | WorkbenchStorageAdapter }
  | { readonly status: 'failed' | 'unavailable' };

function resolveWorkbenchStorage<TStorage extends WorkbenchStorageReader | WorkbenchStorageWriter>(
  storage?: TStorage,
): WorkbenchStorageResolution<TStorage> {
  if (storage) {
    return { status: 'available', storage };
  }

  const resolution = getBrowserStorage('local');
  if (resolution.status !== 'available') {
    return resolution;
  }

  return { status: 'available', storage: createBrowserStorageAdapter(resolution.storage) };
}

function createBrowserStorageAdapter(storage: Storage): WorkbenchRemovableStorageAdapter {
  return {
    getItem(key: string) {
      return storage.getItem(key);
    },
    setItem(key: string, value: string) {
      storage.setItem(key, value);
    },
    removeItem(key: string) {
      storage.removeItem(key);
    },
  };
}

function getBrowserStorage(kind: BrowserWorkbenchStorageKind): BrowserStorageResolution {
  if (typeof globalThis === 'undefined') {
    return { status: 'unavailable' };
  }

  try {
    const storage = kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    return storage ? { status: 'available', storage } : { status: 'unavailable' };
  } catch {
    return { status: 'failed' };
  }
}

function createReadFailureResult<T>(
  storageKey: string,
  code: 'read_failed' | 'decode_failed',
  fallback: () => T,
  onDiagnostic?: WorkbenchPersistenceDiagnosticHandler,
): WorkbenchPersistenceReadResult<T> {
  const diagnostic = createWorkbenchPersistenceDiagnostic(code, storageKey);
  reportDiagnostic(diagnostic, onDiagnostic);
  return { diagnostic, value: fallback() };
}

function createWriteFailureResult(
  storageKey: string,
  onDiagnostic?: WorkbenchPersistenceDiagnosticHandler,
): WorkbenchPersistenceWriteResult {
  const diagnostic = createWorkbenchPersistenceDiagnostic('write_failed', storageKey);
  reportDiagnostic(diagnostic, onDiagnostic);
  return { committed: false, diagnostic };
}

function createWorkbenchPersistenceDiagnostic(
  code: WorkbenchPersistenceDiagnosticCode,
  storageKey: string,
): WorkbenchPersistenceDiagnostic {
  return {
    code,
    message:
      code === 'read_failed'
        ? 'Workbench storage could not be read.'
        : code === 'decode_failed'
          ? 'Workbench storage value could not be decoded.'
          : 'Workbench storage value could not be written.',
    operation: code === 'write_failed' ? 'write' : 'read',
    storageKey,
  };
}

function reportDiagnostic(
  diagnostic: WorkbenchPersistenceDiagnostic,
  onDiagnostic?: WorkbenchPersistenceDiagnosticHandler,
): void {
  try {
    onDiagnostic?.(diagnostic);
  } catch {
    // Diagnostics are observational and must not change persistence behavior.
  }
}

function identity<T>(value: T): T {
  return value;
}
