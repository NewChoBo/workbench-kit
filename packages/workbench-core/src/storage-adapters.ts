import type { WorkbenchRemovableStorageAdapter } from './storage.js';

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
