import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  installExtensionRecord,
  loadInstalledExtensions,
  toggleInstalledExtensionEnabled,
} from './extension-install-state.js';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('extension-install-state', () => {
  it('loads an empty list when storage is missing', () => {
    expect(
      loadInstalledExtensions('workbench-kit/.workbench/test-installed', createMemoryStorage()),
    ).toEqual([]);
  });

  it('installs and toggles extension records', () => {
    const storage = createMemoryStorage();

    installExtensionRecord(
      {
        category: 'theme',
        enabled: true,
        id: 'workbench-kit.samples.theme-alt',
        manifestUrl: 'workbench-kit.samples.theme-alt',
      },
      DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
      storage,
    );

    expect(loadInstalledExtensions(DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY, storage)).toEqual([
      expect.objectContaining({
        category: 'theme',
        enabled: true,
        id: 'workbench-kit.samples.theme-alt',
        manifestUrl: 'workbench-kit.samples.theme-alt',
      }),
    ]);

    toggleInstalledExtensionEnabled(
      'workbench-kit.samples.theme-alt',
      false,
      DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
      storage,
    );

    expect(
      loadInstalledExtensions(DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY, storage)[0]?.enabled,
    ).toBe(false);
  });
});
