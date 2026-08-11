export type BrowserStorageKind = 'local' | 'session';

export interface ClearBrowserStorageByPrefixesOptions {
  kinds?: readonly BrowserStorageKind[];
}

export function tryGetBrowserStorage(kind: BrowserStorageKind): Storage | null {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  try {
    return kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export function collectStorageKeysByPrefix(storage: Storage, prefix: string): string[] {
  const keys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) {
      keys.push(key);
    }
  }

  return keys;
}

/** Removes storage entries whose keys start with any of the given prefixes. */
export function clearBrowserStorageByPrefixes(
  prefixes: readonly string[],
  options: ClearBrowserStorageByPrefixesOptions = {},
): string[] {
  const kinds = options.kinds ?? (['local', 'session'] as const);
  const removed: string[] = [];
  const uniquePrefixes = [...new Set(prefixes.filter((prefix) => prefix.length > 0))];

  for (const kind of kinds) {
    const storage = tryGetBrowserStorage(kind);
    if (!storage) continue;

    for (const prefix of uniquePrefixes) {
      for (const key of collectStorageKeysByPrefix(storage, prefix)) {
        storage.removeItem(key);
        removed.push(key);
      }
    }
  }

  return [...new Set(removed)];
}
