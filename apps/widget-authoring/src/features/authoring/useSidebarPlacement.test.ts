import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_AUTHORING_SIDEBAR_PLACEMENT } from '@workbench-kit/react/authoring';

import { loadSidebarPlacement, persistSidebarPlacement } from './useSidebarPlacement.js';

const STORAGE_KEY = 'widget-authoring.sidebar-placement';

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe('sidebar placement persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock());
  });

  it('loads default placement when storage is empty', () => {
    expect(loadSidebarPlacement()).toEqual(DEFAULT_AUTHORING_SIDEBAR_PLACEMENT);
  });

  it('round-trips placement through localStorage', () => {
    const custom = { left: ['assets'], right: ['properties', 'chat'] };
    persistSidebarPlacement(custom);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(custom));
    expect(loadSidebarPlacement()).toEqual(custom);
  });
});
