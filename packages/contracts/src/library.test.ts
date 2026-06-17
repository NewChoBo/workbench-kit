import { describe, expect, it } from 'vitest';
import {
  createLibraryDragPayload,
  createLibraryItemIdentity,
  DEFAULT_LIBRARY_ITEM_FALLBACK_SOURCE_ID,
  resolveLibraryItemProviderId,
  resolveLibraryItemSourceId,
  LIBRARY_DRAG_DATA_TYPE,
  LIBRARY_DRAG_IDS_DATA_TYPE,
  matchesLibraryItem,
  parseLibraryDragPayload,
  parseLibraryManifestText,
  type LibraryQuery,
  type LibrarySource,
  type LibrarySortMode,
  type LibrarySourceKind,
} from './index';

describe('library contracts', () => {
  const manifestSource: LibrarySource = {
    displayName: 'Local',
    kind: 'json-file' as LibrarySourceKind,
    ref: '/workspace/.apps/library.json',
    sourceId: 'local',
  };

  it('parses and validates manifest shape', () => {
    const manifestText = JSON.stringify({
      id: 'local-library',
      name: 'Local Library',
      schemaVersion: 1,
      source: manifestSource,
      version: '1.0.0',
      items: [
        {
          id: 'note',
          kind: 'url',
          source: manifestSource,
          title: 'Note',
          tags: ['local', 'note'],
        },
      ],
    });

    const manifest = parseLibraryManifestText(manifestText, 'manifest.json');
    expect(manifest).toMatchObject({
      id: 'local-library',
      name: 'Local Library',
      schemaVersion: 1,
      version: '1.0.0',
      source: {
        kind: 'json-file',
        ref: '/workspace/.apps/library.json',
      },
      items: [
        {
          id: 'note',
          title: 'Note',
          kind: 'url',
          source: {
            kind: 'json-file',
            ref: '/workspace/.apps/library.json',
          },
          tags: ['local', 'note'],
        },
      ],
    });
  });

  it('supports item-level source override and query matching', () => {
    const query: LibraryQuery = {
      installed: true,
      kinds: ['game'],
      q: 'steam-game',
      tags: ['indie'],
    };
    const item = {
      categories: ['featured'],
      description: 'Sample steam app',
      id: 'steam-game',
      installed: true,
      kind: 'game' as const,
      metadata: { platform: 'linux' },
      providerId: 'steam',
      source: manifestSource,
      tags: ['indie'],
      title: 'Steam Indie',
    };

    expect(matchesLibraryItem(item, query)).toBe(true);
    expect(
      matchesLibraryItem(
        { ...item, description: 'Noisy test app', title: 'Not match', id: 'other-id' },
        query,
      ),
    ).toBe(false);
  });

  it('encodes and parses drag payload with fixed constants', () => {
    const payload = createLibraryDragPayload(['a', 'b'], ['local']);
    const roundtrip = parseLibraryDragPayload(payload);
    expect(payload.includes('"a"')).toBe(true);
    expect(roundtrip).toMatchObject({ itemIds: ['a', 'b'], sourceIds: ['local'] });
    expect(LIBRARY_DRAG_DATA_TYPE).toBe('application/x-newchobo-ui-library-items');
    expect(LIBRARY_DRAG_IDS_DATA_TYPE).toBe('application/x-newchobo-ui-library-item-ids');
  });

  it('uses sort mode type in compile-time contracts', () => {
    const mode: LibrarySortMode = 'provider';
    expect(mode).toBe('provider');
  });

  it('resolves item provider identity with fallback', () => {
    const item = {
      description: 'provider id first',
      id: 'tile-a',
      kind: 'tile' as const,
      providerId: 'provider-a',
      source: {
        displayName: 'provider source',
        kind: 'json-url' as const,
        ref: '/provider-a.json',
        sourceId: 'provider-source-a',
      },
      title: 'Tile A',
    };

    expect(resolveLibraryItemProviderId(item)).toBe('provider-a');
    expect(resolveLibraryItemSourceId(item)).toBe('provider-source-a');
    expect(createLibraryItemIdentity(item)).toBe('provider-a:tile-a');
  });

  it('falls back to sourceId/providerId/unknown in identity helpers', () => {
    const item = {
      id: 'tile-b',
      kind: 'tile' as const,
      source: {
        kind: 'json-file' as const,
        ref: '/tile-b.json',
      },
      title: 'Tile B',
    };

    expect(resolveLibraryItemProviderId(item)).toBe(DEFAULT_LIBRARY_ITEM_FALLBACK_SOURCE_ID);
    expect(resolveLibraryItemSourceId(item)).toBe(DEFAULT_LIBRARY_ITEM_FALLBACK_SOURCE_ID);
    expect(createLibraryItemIdentity(item)).toBe(
      `${DEFAULT_LIBRARY_ITEM_FALLBACK_SOURCE_ID}:tile-b`,
    );
  });
});
