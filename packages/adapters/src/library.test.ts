import { describe, expect, it } from 'vitest';
import {
  createLibraryManifestObjectProvider,
  createLibraryManifestUrlProvider,
  createStaticLibraryManifestProvider,
} from './library';

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
  it('accepts object manifest descriptors and normalizes missing manifest sourceId', async () => {
    const provider = createLibraryManifestObjectProvider({
      displayName: 'Object Library',
      id: 'object-lib',
      manifest: {
        id: 'object-library',
        name: 'Object Library',
        schemaVersion: 1,
        source: {
          displayName: 'Provider Source',
          kind: 'json-file',
          ref: '/manifests/object.json',
        },
        version: '1.0.0',
        items: [
          {
            id: 'tile-a',
            kind: 'tile',
            title: 'Tile A',
          },
        ],
      },
    });

    const items = await provider.listItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'tile-a',
      source: {
        displayName: 'Provider Source',
        kind: 'json-file',
        ref: '/manifests/object.json',
        sourceId: 'object-lib',
      },
    });
  });

  it('keeps item-level sourceId when present on object input', async () => {
    const provider = createLibraryManifestObjectProvider({
      displayName: 'Object Library',
      id: 'object-lib-2',
      manifest: {
        id: 'object-library',
        name: 'Object Library',
        schemaVersion: 1,
        source: {
          displayName: 'Provider Source',
          kind: 'json-file',
          ref: '/manifests/object-provider.json',
        },
        version: '1.0.0',
        items: [
          {
            id: 'tile-a',
            kind: 'tile',
            title: 'Tile A',
            source: {
              displayName: 'Item Source',
              kind: 'json-url',
              ref: '/manifests/item.json',
              sourceId: 'item-source',
            },
          },
        ],
      },
    });

    const items = await provider.listItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source: {
        displayName: 'Item Source',
        kind: 'json-url',
        ref: '/manifests/item.json',
        sourceId: 'item-source',
      },
      providerId: 'object-lib-2',
    });
  });

  it('propagates object manifest parse errors', async () => {
    const provider = createLibraryManifestObjectProvider({
      displayName: 'Invalid Object Library',
      id: 'invalid-object-lib',
      manifest: {
        id: 'invalid-object-library',
        name: 'Invalid Object Library',
        schemaVersion: 1,
        source: {
          kind: 'invalid-kind',
          ref: '/manifests/invalid.json',
        },
        version: '1.0.0',
        items: [],
      },
      });

    await expect(provider.listItems()).rejects.toThrow(
      'source.kind must be one of embedded-json, json-file, or json-url',
    );
  });

  it('throws for invalid static manifest text', async () => {
    const provider = createStaticLibraryManifestProvider({
      displayName: 'Invalid',
      id: 'invalid-lib',
      manifestText: '{',
    });

    await expect(provider.listItems()).rejects.toThrow('invalid JSON');
  });

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
