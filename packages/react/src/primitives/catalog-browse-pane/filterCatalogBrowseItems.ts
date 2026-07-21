import type { CatalogBrowseItem } from './CatalogBrowsePane';

/**
 * Client-side text match for catalog rows — label, meta, and description.
 * Hosts own domain filtering; use this after mapping to `CatalogBrowseItem`.
 */
export function matchCatalogBrowseItem(item: CatalogBrowseItem, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  const haystacks = [item.label, item.meta, item.description];
  return haystacks.some(
    (value) => typeof value === 'string' && value.toLowerCase().includes(normalized),
  );
}

export function filterCatalogBrowseItems(
  items: ReadonlyArray<CatalogBrowseItem>,
  query: string,
): CatalogBrowseItem[] {
  const normalized = query.trim();
  if (normalized.length === 0) {
    return [...items];
  }
  return items.filter((item) => matchCatalogBrowseItem(item, normalized));
}
