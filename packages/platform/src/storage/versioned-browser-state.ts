import { tryGetBrowserStorage } from './browser-storage.js';

/**
 * Versioned browser-storage helper for chrome-layout persistence (sidebar
 * visibility/width, etc.). Exact-reject on `kind` / `schemaVersion` mismatch
 * so hosts own migrations explicitly.
 *
 * Boundary: prefer this for short-lived chrome layout blobs only. Do not use
 * it as a substitute for preference/config scopes in workbench-config.
 *
 * Envelope shape is flat (no nested `data`):
 * `{ kind, schemaVersion, ...TFields }`.
 * `parseFields` receives that full parsed object; ignore meta keys and map
 * only field values into `T`.
 */

export interface BrowserKeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface VersionedBrowserStateAdapterOptions<T extends object> {
  key: string;
  kind: string;
  schemaVersion: number;
  /** Validate + map unknown JSON fields → T; throw to reject. */
  parseFields: (value: Record<string, unknown>) => T;
  clamp?: (value: T) => T;
  /** Defaults to `localStorage` when available; `null` forces missing storage. */
  storage?: BrowserKeyValueStorage | null;
}

export interface VersionedBrowserStateAdapter<T extends object> {
  read(): T | null;
  write(value: T): void;
}

function resolveStorage(
  storage: BrowserKeyValueStorage | null | undefined,
): BrowserKeyValueStorage | null {
  if (storage === undefined) {
    return tryGetBrowserStorage('local');
  }
  return storage;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createVersionedBrowserStateAdapter<T extends object>(
  options: VersionedBrowserStateAdapterOptions<T>,
): VersionedBrowserStateAdapter<T> {
  const { key, kind, schemaVersion, parseFields, clamp } = options;

  const applyClamp = (value: T): T => (clamp ? clamp(value) : value);

  return {
    read(): T | null {
      const storage = resolveStorage(options.storage);
      if (!storage) {
        return null;
      }

      let raw: string | null;
      try {
        raw = storage.getItem(key);
      } catch {
        return null;
      }

      if (raw === null) {
        return null;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return null;
      }

      if (!isPlainObject(parsed)) {
        return null;
      }

      if (parsed.kind !== kind || parsed.schemaVersion !== schemaVersion) {
        return null;
      }

      let fields: T;
      try {
        fields = parseFields(parsed);
      } catch {
        return null;
      }

      return applyClamp(fields);
    },

    write(value: T): void {
      const storage = resolveStorage(options.storage);
      if (!storage) {
        return;
      }

      const fields = applyClamp(value);
      // Flat envelope; meta keys win if `T` ever overlaps.
      const envelope = {
        ...fields,
        kind,
        schemaVersion,
      };

      try {
        storage.setItem(key, JSON.stringify(envelope));
      } catch {
        // Missing / quota / private-mode storage: write is a no-op.
      }
    },
  };
}
