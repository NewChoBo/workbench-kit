import { describe, expect, it } from 'vitest';
import {
  createLibraryDragPayload,
  LIBRARY_DRAG_DATA_TYPE,
  LIBRARY_DRAG_IDS_DATA_TYPE,
  LibrarySortMode,
  matchesLibraryItem,
  parseLibraryDragPayload,
  parseLibraryManifestText,
  type LibraryQuery,
  type LibrarySource,
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
    expect(payload.includes('\"a\"')).toBe(true);
    expect(roundtrip).toMatchObject({ itemIds: ['a', 'b'], sourceIds: ['local'] });
    expect(LIBRARY_DRAG_DATA_TYPE).toBe('application/x-newchobo-ui-library-items');
    expect(LIBRARY_DRAG_IDS_DATA_TYPE).toBe('application/x-newchobo-ui-library-item-ids');
  });

  it('uses sort mode type in compile-time contracts', () => {
    const mode: LibrarySortMode = 'provider';
    expect(mode).toBe('provider');
  });
});
