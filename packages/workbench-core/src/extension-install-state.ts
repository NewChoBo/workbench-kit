export const DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY =
  'workbench-kit/.workbench/installed-extensions' as const;

export type InstalledExtensionCategory = 'theme' | 'locale' | 'editor' | 'utility' | string;

export interface InstalledExtensionRecord {
  readonly category: InstalledExtensionCategory;
  readonly enabled: boolean;
  readonly id: string;
  readonly installedAt: string;
  readonly manifestUrl: string;
}

export function isInstalledExtensionPersistenceAvailable(): boolean {
  try {
    return typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function loadInstalledExtensions(
  storageKey: string = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  storage?: Pick<Storage, 'getItem'>,
): InstalledExtensionRecord[] {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return [];
  }

  try {
    const raw = resolvedStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      const record = normalizeInstalledExtensionRecord(entry);
      return record ? [record] : [];
    });
  } catch {
    return [];
  }
}

export function saveInstalledExtensions(
  records: readonly InstalledExtensionRecord[],
  storageKey: string = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  storage?: Pick<Storage, 'setItem'>,
): void {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(storageKey, JSON.stringify(records, null, 2));
}

export function installExtensionRecord(
  record: Omit<InstalledExtensionRecord, 'installedAt'> & { installedAt?: string },
  storageKey: string = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): InstalledExtensionRecord[] {
  const current = loadInstalledExtensions(storageKey, storage);
  const nextRecord: InstalledExtensionRecord = {
    ...record,
    installedAt: record.installedAt ?? new Date().toISOString(),
  };
  const without = current.filter((entry) => entry.id !== nextRecord.id);
  const next = [...without, nextRecord];
  saveInstalledExtensions(next, storageKey, storage);
  return next;
}

export function toggleInstalledExtensionEnabled(
  extensionId: string,
  enabled: boolean,
  storageKey: string = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): InstalledExtensionRecord[] {
  const current = loadInstalledExtensions(storageKey, storage);
  const index = current.findIndex((entry) => entry.id === extensionId);
  if (index < 0) {
    return current;
  }

  const next = [...current];
  next[index] = { ...next[index], enabled };
  saveInstalledExtensions(next, storageKey, storage);
  return next;
}

export function getInstalledExtensionRecord(
  extensionId: string,
  storageKey: string = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  storage?: Pick<Storage, 'getItem'>,
): InstalledExtensionRecord | undefined {
  return loadInstalledExtensions(storageKey, storage).find((entry) => entry.id === extensionId);
}

function normalizeInstalledExtensionRecord(value: unknown): InstalledExtensionRecord | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as Partial<InstalledExtensionRecord>;
  if (
    typeof record.id !== 'string' ||
    typeof record.manifestUrl !== 'string' ||
    typeof record.category !== 'string' ||
    typeof record.enabled !== 'boolean' ||
    typeof record.installedAt !== 'string'
  ) {
    return undefined;
  }

  return {
    category: record.category,
    enabled: record.enabled,
    id: record.id,
    installedAt: record.installedAt,
    manifestUrl: record.manifestUrl,
  };
}

function getBrowserLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
