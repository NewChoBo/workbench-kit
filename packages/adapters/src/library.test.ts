import { describe, expect, it } from 'vitest';
import { createLibraryManifestUrlProvider, createStaticLibraryManifestProvider } from './library';

const manifestText = (sourceRef: string, itemSourceRef?: string) =>
  JSON.stringify({
    id: 'library-test',
    name: 'Library Test',
    schemaVersion: 1,
    source: {
      displayName: 'Provider Source',
      kind: 'json-file',
      ref: sourceRef,
    },
    version: '1.0.0',
    items: [
      {
        id: 'tile-a',
        kind: 'tile',
        source: itemSourceRef
          ? {
              displayName: 'Item Source',
              kind: 'json-file',
              ref: itemSourceRef,
            }
          : undefined,
        title: 'Tile A',
      },
    ],
  });

describe('library adapters', () => {
  it('provides stable provider ids for items when manifest/source has no sourceId', async () => {
    const provider = createStaticLibraryManifestProvider({
      displayName: 'Static Library',
      id: 'static-lib',
      manifestText: manifestText('/manifests/static.json'),
    });

    const items = await provider.listItems();
    expect(items).toHaveLength(1);

    expect(items[0]).toMatchObject({
      id: 'tile-a',
      providerId: 'static-lib',
      source: {
        displayName: 'Provider Source',
        kind: 'json-file',
        ref: '/manifests/static.json',
        sourceId: 'static-lib',
      },
      title: 'Tile A',
    });
  });

  it('keeps item-level source when available and still backfills provider metadata', async () => {
    const provider = createStaticLibraryManifestProvider({
      displayName: 'Static Library',
      id: 'static-lib',
      manifestText: manifestText('/manifests/static.json', '/manifests/items/tile-a.json'),
    });

    const items = await provider.listItems();
    expect(items[0]).toMatchObject({
      source: {
        displayName: 'Item Source',
        kind: 'json-file',
        ref: '/manifests/items/tile-a.json',
        sourceId: 'static-lib',
      },
    });
  });

  it('loads remote manifest via custom reader for URL source', async () => {
    let loadedUrl = '';
    const provider = createLibraryManifestUrlProvider({
      displayName: 'Remote Library',
      id: 'remote-lib',
      manifestUrl: 'https://cdn.example/library.json',
      readText: async (url: string) => {
        loadedUrl = url;
        return manifestText('https://cdn.example/library.json');
      },
    });

    const items = await provider.listItems();
    expect(loadedUrl).toBe('https://cdn.example/library.json');
    expect(items[0].title).toBe('Tile A');
  });
});
