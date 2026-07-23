export type ExtensionCatalogCategory = 'theme' | 'locale' | 'editor' | 'utility' | string;

export interface ExtensionCatalogEntry {
  readonly category: ExtensionCatalogCategory;
  readonly description: string;
  readonly displayName: string;
  readonly icon?: string | undefined;
  readonly id: string;
  readonly manifestUrl: string;
}

export interface ExtensionCatalog {
  readonly entries: readonly ExtensionCatalogEntry[];
  readonly schemaVersion: number;
}

export function parseExtensionCatalog(value: unknown): ExtensionCatalog {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Extension catalog must be an object.');
  }

  const catalog = value as Partial<ExtensionCatalog>;
  const schemaVersion = catalog.schemaVersion;
  if (schemaVersion !== 1) {
    throw new Error(`Unsupported extension catalog schema version: ${String(schemaVersion)}.`);
  }

  if (!Array.isArray(catalog.entries)) {
    throw new Error('Extension catalog entries must be an array.');
  }

  const entries = catalog.entries.flatMap((entry, index) => {
    const normalized = normalizeExtensionCatalogEntry(entry);
    if (!normalized) {
      throw new Error(`Invalid extension catalog entry at index ${index}.`);
    }
    return [normalized];
  });

  return {
    entries,
    schemaVersion,
  };
}

function normalizeExtensionCatalogEntry(value: unknown): ExtensionCatalogEntry | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const entry = value as Partial<ExtensionCatalogEntry>;
  if (
    typeof entry.id !== 'string' ||
    typeof entry.displayName !== 'string' ||
    typeof entry.description !== 'string' ||
    typeof entry.category !== 'string' ||
    typeof entry.manifestUrl !== 'string'
  ) {
    return undefined;
  }

  return {
    category: entry.category,
    description: entry.description,
    displayName: entry.displayName,
    icon: typeof entry.icon === 'string' ? entry.icon : undefined,
    id: entry.id,
    manifestUrl: entry.manifestUrl,
  };
}
