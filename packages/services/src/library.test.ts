import { describe, expect, it } from 'vitest';
import type { LibraryItemDescriptor, LibraryProvider, LibraryQuery } from '@newchobo-ui/contracts';
import { LibraryCatalogService } from './library';

const goodProvider: LibraryProvider = {
  id: 'good',
  displayName: 'Good Source',
  async listItems() {
    return [
      {
        categories: ['featured'],
        id: 'tile-a',
        kind: 'tile',
        source: {
          kind: 'json-file',
          ref: '/workspace/source/good-library.json',
          sourceId: 'good',
        },
        title: 'Alpha Tile',
        tags: ['first'],
      },
      {
        id: 'app-a',
        kind: 'app',
        source: {
          kind: 'json-file',
          ref: '/workspace/source/good-library.json',
          sourceId: 'good',
        },
        title: 'Beta App',
      },
    ];
  },
};

const flakyProvider: LibraryProvider = {
  id: 'bad',
  displayName: 'Flaky Source',
  async listItems() {
    throw new Error('provider offline');
  },
};

function createItem(id: string, title: string, kind: LibraryItemDescriptor['kind'], providerId: string, installed = false): LibraryItemDescriptor {
  return {
    id,
    installed,
    kind,
    providerId,
    source: {
      kind: 'json-url',
      ref: `https://example.com/${providerId}.json`,
      sourceId: providerId,
    },
    title,
  };
}

describe('LibraryCatalogService', () => {
  it('aggregates providers, filters, and applies query sort ordering', async () => {
    const now = () => '2026-06-03T00:00:00.000Z';
    const service = new LibraryCatalogService({
      providers: [goodProvider],
      requestId: () => 'req-1',
      now,
    });

    const snapshot = await service.listCatalog({
      query: {
        limit: 1,
        q: 'tile',
        sortBy: 'title',
      },
    });

    expect(snapshot.cachedAt).toBe(now());
    expect(snapshot.fromCache).toBe(false);
    expect(snapshot.providers).toMatchObject([
      { sourceId: 'good', title: 'Good Source', state: 'ready', itemCount: 2 },
    ]);
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({ id: 'tile-a', source: { sourceId: 'good' } });
    expect(snapshot.items[0]).toMatchObject({ title: 'Alpha Tile' });
  });

  it('keeps cache and reuses provider responses until ttl expires', async () => {
    const service = new LibraryCatalogService({
      providers: [goodProvider, flakyProvider],
      cacheTtlMs: 30_000,
      requestId: () => 'req-cache',
      now: () => '2026-06-03T00:00:01.000Z',
    });

    const first = await service.listCatalog();
    const second = await service.listCatalog();

    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(2);
    expect(second.providers).toContainEqual(
      expect.objectContaining({ sourceId: 'bad', state: 'error' }),
    );
  });

  it('supports direct sort modes with provider/group filter', async () => {
    const service = new LibraryCatalogService({
      providers: [
        {
          id: 'a',
          displayName: 'A',
          async listItems() {
            return [
              createItem('b', 'Beta', 'game', 'provider-a', true),
              createItem('a', 'Alpha', 'game', 'provider-a', false),
            ];
          },
        },
        {
          id: 'b',
          displayName: 'B',
          async listItems() {
            return [createItem('c', 'Gamma', 'url', 'provider-b', true)];
          },
        },
      ],
    });

    const sortedByProvider = await service.listCatalog({ query: { sortBy: 'provider' } });
    const sortedByInstalled = await service.listCatalog({ query: { sortBy: 'installed' } });
    expect(sortedByProvider.items[0]).toMatchObject({ providerId: 'provider-a' });
    expect(sortedByInstalled.items[0]).toMatchObject({ id: 'b' });

    const onlyInstalled = await service.listCatalog({
      query: {
        installed: true,
        kinds: ['game'],
      } satisfies LibraryQuery,
    });
    expect(onlyInstalled.items.map((item) => item.id)).toEqual(['b']);
  });
});
