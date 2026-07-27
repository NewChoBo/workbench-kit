import type { ExtensionCatalogBrowseEntry, ExtensionManagementEntry } from './types.js';

export function filterInstalledEntries(
  entries: readonly ExtensionManagementEntry[],
  query: string,
): readonly ExtensionManagementEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return entries;
  }

  return entries.filter((entry) =>
    [entry.displayName, entry.id, entry.category, entry.description ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalized),
  );
}

export function filterBrowseEntries(
  entries: readonly ExtensionCatalogBrowseEntry[],
  query: string,
  category?: string,
): readonly ExtensionCatalogBrowseEntry[] {
  const normalized = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (category && entry.category !== category) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    return [entry.displayName, entry.id, entry.category, entry.description]
      .join(' ')
      .toLowerCase()
      .includes(normalized);
  });
}
