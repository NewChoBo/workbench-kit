import {
  createLibraryItemIdentity,
  resolveLibraryItemProviderId,
  type LibraryCatalogSnapshot,
  type LibraryItemDescriptor,
  type LibraryProvider,
  type LibraryProviderSummary,
  type LibraryQuery,
  type LibraryQueryOptions,
  matchesLibraryItem,
} from '@workbench-kit/contracts';

export interface LibraryCatalogServiceOptions {
  cacheTtlMs?: number;
  now?: () => string;
  providers?: readonly LibraryProvider[];
  requestId?: () => string;
}

export interface LibraryCatalogRequest {
  query?: LibraryQuery;
  refresh?: boolean;
}

const DEFAULT_CACHE_TTL_MS = 30_000;

export class LibraryCatalogService {
  private readonly cacheTtlMs: number;
  private readonly now: () => string;
  private readonly providers = new Map<string, LibraryProvider>();
  private readonly requestId: () => string;
  private cache: {
    createdAtMs: number;
    baseItems: readonly LibraryItemDescriptor[];
    providers: readonly LibraryProviderSummary[];
  } | null = null;

  constructor({
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
    now = () => new Date().toISOString(),
    providers = [],
    requestId = defaultRequestId,
  }: LibraryCatalogServiceOptions = {}) {
    this.cacheTtlMs = cacheTtlMs;
    this.now = now;
    this.requestId = requestId;
    providers.forEach((provider) => {
      this.providers.set(provider.id, provider);
    });
  }

  registerProvider(provider: LibraryProvider): void {
    this.providers.set(provider.id, provider);
  }

  unregisterProvider(providerId: string): void {
    this.providers.delete(providerId);
    this.cache = null;
  }

  listProviderIds(): string[] {
    return [...this.providers.keys()].sort();
  }

  listProviders(): readonly LibraryProviderSummary[] {
    return [...this.providers.values()].map((provider) => ({
      itemCount: 0,
      sourceId: provider.id,
      state: 'ready',
      title: provider.displayName,
    }));
  }

  async refreshCatalog(options: LibraryQueryOptions = {}): Promise<LibraryCatalogSnapshot> {
    const result = await this.fetchCatalog(
      { refresh: true, ...options },
      this.createRequestMetadata(),
    );
    return result.catalog;
  }

  async listCatalog(
    options: LibraryQueryOptions & LibraryCatalogRequest = {},
  ): Promise<LibraryCatalogSnapshot> {
    const result = await this.fetchCatalog(options, this.createRequestMetadata());
    return result.catalog;
  }

  private async fetchCatalog(
    options: LibraryCatalogRequest = {},
    metadata: { requestId?: string; requestedAt?: string } = {},
  ): Promise<{ catalog: LibraryCatalogSnapshot }> {
    const refresh = options.refresh === true;
    const nowMs = Date.now();
    const cached = this.getCachedSnapshot(nowMs, refresh);
    if (cached) {
      const filteredItems = this.applyQuery(cached.baseItems, options.query);
      return {
        catalog: {
          cachedAt: this.now(),
          fromCache: true,
          items: filteredItems,
          providers: cached.providers,
          query: options.query,
          ...metadata,
        },
      };
    }

    const summaries: LibraryProviderSummary[] = [];
    const allItems: LibraryItemDescriptor[] = [];

    await Promise.all(
      [...this.providers.values()].map(async (provider) => {
        try {
          const items = await provider.listItems();
          const uniqueItems = dedupeItems(items);
          summaries.push({
            itemCount: uniqueItems.length,
            sourceId: provider.id,
            state: 'ready',
            title: provider.displayName,
          });
          allItems.push(...uniqueItems);
        } catch (error) {
          summaries.push({
            error: error instanceof Error ? error.message : String(error),
            sourceId: provider.id,
            state: 'error',
            title: provider.displayName,
            itemCount: 0,
          });
        }
      }),
    );

    const filteredItems = this.applyQuery(allItems, options.query);
    this.cache = {
      createdAtMs: nowMs,
      baseItems: allItems,
      providers: summaries,
    };

    return {
      catalog: {
        cachedAt: this.now(),
        fromCache: false,
        items: filteredItems,
        providers: summaries,
        query: options.query,
        ...metadata,
      },
    };
  }

  private getCachedSnapshot(nowMs: number, forceRefresh = false) {
    if (forceRefresh || !this.cache) {
      return null;
    }
    if (nowMs - this.cache.createdAtMs > this.cacheTtlMs) {
      this.cache = null;
      return null;
    }
    return this.cache;
  }

  private applyQuery(
    items: readonly LibraryItemDescriptor[],
    query: LibraryQuery = {},
  ): readonly LibraryItemDescriptor[] {
    const filtered = items.filter((item) => matchesLibraryItem(item, query));
    const normalized = this.sortItems(filtered, query.sortBy ?? 'title');
    if (query.limit && query.limit > 0) {
      return normalized.slice(0, query.limit);
    }
    return normalized;
  }

  private sortItems(
    items: readonly LibraryItemDescriptor[],
    sortBy: 'installed' | 'provider' | 'title',
  ): readonly LibraryItemDescriptor[] {
    const copied = [...items];
    copied.sort((left, right) => {
      if (sortBy === 'provider') {
        return compareProvider(left, right);
      }
      if (sortBy === 'installed') {
        return Number(Boolean(right.installed)) - Number(Boolean(left.installed));
      }
      return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
    });
    return copied;
  }

  private createRequestMetadata(): { requestId?: string; requestedAt?: string } {
    return {
      requestId: this.requestId(),
      requestedAt: this.now(),
    };
  }
}

function compareProvider(left: LibraryItemDescriptor, right: LibraryItemDescriptor): number {
  const leftProvider = resolveLibraryItemProviderId(left).toLowerCase();
  const rightProvider = resolveLibraryItemProviderId(right).toLowerCase();
  if (leftProvider === rightProvider) return 0;
  return leftProvider.localeCompare(rightProvider);
}

function dedupeItems(items: readonly LibraryItemDescriptor[]): readonly LibraryItemDescriptor[] {
  const seen = new Set<string>();
  const result: LibraryItemDescriptor[] = [];

  for (const item of items) {
    const key = createLibraryItemIdentity(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }

  return result;
}

function defaultRequestId() {
  return `library-${Math.random().toString(36).slice(2, 10)}`;
}
