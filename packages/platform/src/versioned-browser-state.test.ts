import { describe, expect, it, vi } from 'vitest';

import {
  createVersionedBrowserStateAdapter,
  type BrowserKeyValueStorage,
} from './versioned-browser-state.js';

interface LayoutFields {
  sidebarVisible: boolean;
  sidebarWidthPx: number;
}

function createMemoryStorage(initial: Record<string, string> = {}): BrowserKeyValueStorage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}

function parseLayoutFields(value: Record<string, unknown>): LayoutFields {
  if (typeof value.sidebarVisible !== 'boolean') {
    throw new Error('sidebarVisible');
  }
  if (typeof value.sidebarWidthPx !== 'number' || !Number.isFinite(value.sidebarWidthPx)) {
    throw new Error('sidebarWidthPx');
  }
  return {
    sidebarVisible: value.sidebarVisible,
    sidebarWidthPx: value.sidebarWidthPx,
  };
}

function clampLayout(value: LayoutFields): LayoutFields {
  return {
    ...value,
    sidebarWidthPx: Math.min(480, Math.max(160, value.sidebarWidthPx)),
  };
}

describe('createVersionedBrowserStateAdapter', () => {
  it('round-trips through memory storage', () => {
    const storage = createMemoryStorage();
    const adapter = createVersionedBrowserStateAdapter<LayoutFields>({
      key: 'host:chrome-layout',
      kind: 'chrome-layout',
      schemaVersion: 1,
      parseFields: parseLayoutFields,
      storage,
    });

    const value: LayoutFields = { sidebarVisible: true, sidebarWidthPx: 280 };
    adapter.write(value);

    expect(adapter.read()).toEqual(value);
    expect(JSON.parse(storage.getItem('host:chrome-layout')!)).toEqual({
      sidebarVisible: true,
      sidebarWidthPx: 280,
      kind: 'chrome-layout',
      schemaVersion: 1,
    });
  });

  it('returns null when kind or schemaVersion mismatch', () => {
    const storage = createMemoryStorage({
      'host:chrome-layout': JSON.stringify({
        kind: 'other-kind',
        schemaVersion: 1,
        sidebarVisible: true,
        sidebarWidthPx: 280,
      }),
    });
    const adapter = createVersionedBrowserStateAdapter<LayoutFields>({
      key: 'host:chrome-layout',
      kind: 'chrome-layout',
      schemaVersion: 1,
      parseFields: parseLayoutFields,
      storage,
    });

    expect(adapter.read()).toBeNull();

    storage.setItem(
      'host:chrome-layout',
      JSON.stringify({
        kind: 'chrome-layout',
        schemaVersion: 2,
        sidebarVisible: true,
        sidebarWidthPx: 280,
      }),
    );
    expect(adapter.read()).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const storage = createMemoryStorage({
      'host:chrome-layout': '{not-json',
    });
    const adapter = createVersionedBrowserStateAdapter<LayoutFields>({
      key: 'host:chrome-layout',
      kind: 'chrome-layout',
      schemaVersion: 1,
      parseFields: parseLayoutFields,
      storage,
    });

    expect(adapter.read()).toBeNull();
  });

  it('applies clamp on read and write', () => {
    const storage = createMemoryStorage({
      'host:chrome-layout': JSON.stringify({
        kind: 'chrome-layout',
        schemaVersion: 1,
        sidebarVisible: false,
        sidebarWidthPx: 999,
      }),
    });
    const adapter = createVersionedBrowserStateAdapter<LayoutFields>({
      key: 'host:chrome-layout',
      kind: 'chrome-layout',
      schemaVersion: 1,
      parseFields: parseLayoutFields,
      clamp: clampLayout,
      storage,
    });

    expect(adapter.read()).toEqual({
      sidebarVisible: false,
      sidebarWidthPx: 480,
    });

    adapter.write({ sidebarVisible: true, sidebarWidthPx: 40 });
    expect(JSON.parse(storage.getItem('host:chrome-layout')!)).toEqual({
      sidebarVisible: true,
      sidebarWidthPx: 160,
      kind: 'chrome-layout',
      schemaVersion: 1,
    });
    expect(adapter.read()).toEqual({
      sidebarVisible: true,
      sidebarWidthPx: 160,
    });
  });

  it('treats missing storage as read null and write no-op', () => {
    const adapter = createVersionedBrowserStateAdapter<LayoutFields>({
      key: 'host:chrome-layout',
      kind: 'chrome-layout',
      schemaVersion: 1,
      parseFields: parseLayoutFields,
      storage: null,
    });

    expect(adapter.read()).toBeNull();
    expect(() => {
      adapter.write({ sidebarVisible: true, sidebarWidthPx: 280 });
    }).not.toThrow();
  });

  it('returns null when parseFields throws', () => {
    const storage = createMemoryStorage({
      'host:chrome-layout': JSON.stringify({
        kind: 'chrome-layout',
        schemaVersion: 1,
        sidebarVisible: 'yes',
        sidebarWidthPx: 280,
      }),
    });
    const adapter = createVersionedBrowserStateAdapter<LayoutFields>({
      key: 'host:chrome-layout',
      kind: 'chrome-layout',
      schemaVersion: 1,
      parseFields: parseLayoutFields,
      storage,
    });

    expect(adapter.read()).toBeNull();
  });

  it('does not throw when storage getItem/setItem throw', () => {
    const storage: BrowserKeyValueStorage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('quota');
      }),
    };
    const adapter = createVersionedBrowserStateAdapter<LayoutFields>({
      key: 'host:chrome-layout',
      kind: 'chrome-layout',
      schemaVersion: 1,
      parseFields: parseLayoutFields,
      storage,
    });

    expect(adapter.read()).toBeNull();
    expect(() => {
      adapter.write({ sidebarVisible: true, sidebarWidthPx: 280 });
    }).not.toThrow();
  });
});
