import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  readPersistedWorkbenchLayout,
  resolvePersistedWorkbenchLayout,
  writePersistedWorkbenchLayout,
} from './workbench-layout-storage.js';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe('workbench-layout-storage', () => {
  it('merges persisted layout over bootstrap defaults', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        activityBar: {
          itemOrder: ['search', 'explorer', 'chatting', 'aiChat'],
          visible: true,
        },
        panel: { visible: false },
        sideBar: {
          activeViewContainer: 'search',
          visible: true,
        },
      }),
    );

    const resolved = resolvePersistedWorkbenchLayout(
      {
        activityBar: {
          itemOrder: ['explorer', 'search', 'chatting', 'aiChat'],
        },
        sideBar: {
          activeViewContainer: 'explorer',
          visible: true,
        },
      },
      { storage },
    );

    expect(resolved?.activityBar?.itemOrder).toEqual(['search', 'explorer', 'chatting', 'aiChat']);
    expect(resolved?.sideBar?.activeViewContainer).toBe('search');
  });

  it('round-trips layout state through storage', () => {
    const storage = createMemoryStorage();

    writePersistedWorkbenchLayout(
      {
        activityBar: {
          itemOrder: ['explorer', 'aiChat', 'search', 'chatting'],
          visible: true,
        },
        panel: { visible: false },
        sideBar: {
          activeViewContainer: 'aiChat',
          visible: false,
        },
      },
      DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
      storage,
    );

    expect(readPersistedWorkbenchLayout(DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY, storage)).toEqual({
      activityBar: {
        itemOrder: ['explorer', 'aiChat', 'search', 'chatting'],
        visible: true,
      },
      panel: { visible: false },
      sideBar: {
        activeViewContainer: 'aiChat',
        visible: false,
      },
    });
  });

  it('ignores invalid persisted layout payloads', () => {
    const storage = createMemoryStorage();
    storage.setItem(DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY, '{not-json');

    expect(
      resolvePersistedWorkbenchLayout(
        {
          sideBar: { activeViewContainer: 'explorer' },
        },
        { storage },
      )?.sideBar?.activeViewContainer,
    ).toBe('explorer');
  });
});
