import type {
  WorkbenchRemovableStorageAdapter,
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

/**
 * Wraps browser `localStorage` or `sessionStorage` as a removable adapter.
 * Returns `undefined` when the chosen web storage is unavailable.
 *
 * Do not store secrets here — use `createMemorySecretStorage` / vault.
 */
export function createBrowserWorkbenchStorage(
  options: CreateBrowserWorkbenchStorageOptions = {},
): WorkbenchRemovableStorageAdapter | undefined {
  const storage = options.storage ?? getBrowserStorage(options.kind ?? 'local');
  if (!storage) {
    return undefined;
  }

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

export function readWorkbenchStorageArray<T>(
  storageKey: string,
  normalize: (value: unknown) => T | undefined,
  storage?: WorkbenchStorageReader,
): T[] {
  const resolvedStorage = storage ?? createBrowserWorkbenchStorage({ kind: 'local' });
  if (!resolvedStorage) {
    return [];
  }

  try {
    const parsed = JSON.parse(resolvedStorage.getItem(storageKey) ?? 'null') as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      const normalized = normalize(entry);
      return normalized === undefined ? [] : [normalized];
    });
  } catch {
    return [];
  }
}

export function writeWorkbenchStorageJson(
  storageKey: string,
  value: unknown,
  storage?: WorkbenchStorageWriter,
): void {
  const resolvedStorage = storage ?? createBrowserWorkbenchStorage({ kind: 'local' });
  resolvedStorage?.setItem(storageKey, JSON.stringify(value, null, 2));
}

function getBrowserStorage(kind: BrowserWorkbenchStorageKind): Storage | undefined {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }

  try {
    return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}
