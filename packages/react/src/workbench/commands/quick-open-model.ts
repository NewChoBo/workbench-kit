export interface QuickOpenItem {
  /** Stable item id (often a workspace path). */
  id: string;
  label: string;
  description?: string | undefined;
  detail?: string | undefined;
  icon?: string | undefined;
  disabled?: boolean | undefined;
  /** Provider-specific payload (e.g. `{ path }`). */
  data?: unknown;
}

export interface QuickOpenProvider {
  id: string;
  label: string;
  search: (query: string) => Promise<QuickOpenItem[]> | QuickOpenItem[];
}

export interface QuickOpenSelectContext {
  index: number;
  providerId: string;
  query: string;
}

export function isQuickOpenItemSelectable(item: QuickOpenItem) {
  return !item.disabled;
}

export function getNextQuickOpenItemIndex({
  currentIndex,
  direction,
  items,
}: {
  currentIndex: number;
  direction: 'next' | 'previous';
  items: readonly QuickOpenItem[];
}) {
  if (items.length === 0) {
    return -1;
  }

  const step = direction === 'next' ? 1 : -1;
  let nextIndex = currentIndex;

  for (let attempt = 0; attempt < items.length; attempt += 1) {
    nextIndex = (nextIndex + step + items.length) % items.length;
    const item = items[nextIndex];
    if (item && isQuickOpenItemSelectable(item)) {
      return nextIndex;
    }
  }

  return -1;
}

/** Default debounce for provider search while typing. */
export const DEFAULT_QUICK_OPEN_SEARCH_DEBOUNCE_MS = 200;
