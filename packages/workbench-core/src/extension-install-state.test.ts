import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  applyExtensionInstallPlanToRecords,
  installExtensionRecord,
  loadInstalledExtensions,
  toggleInstalledExtensionEnabled,
} from './extension-install-state.js';
import { createExtensionInstallPlan, type WorkbenchExtensionDescription } from './index.js';

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

  it('applies install plan actions as one record update', () => {
    const installedAt = '2026-06-21T00:00:00.000Z';
    const currentRecords = [
      {
        category: 'utility',
        enabled: false,
        id: 'dependency',
        installedAt,
        manifestUrl: 'dependency',
      },
    ];
    const installSources = [
      {
        category: 'utility',
        id: 'dependency',
        manifestUrl: 'dependency',
      },
      {
        category: 'utility',
        id: 'target',
        manifestUrl: 'target',
      },
    ];
    const plan = createExtensionInstallPlan({
      availableExtensions: [
        extension('target', {
          extensionDependencies: ['dependency'],
        }),
        extension('dependency'),
      ],
      installSources,
      installedRecords: currentRecords,
      targetExtensionId: 'target',
    });

    expect(
      applyExtensionInstallPlanToRecords({
        currentRecords,
        installSources,
        installedAt,
        plan,
      }),
    ).toEqual([
      {
        category: 'utility',
        enabled: true,
        id: 'dependency',
        installedAt,
        manifestUrl: 'dependency',
      },
      {
        category: 'utility',
        enabled: true,
        id: 'target',
        installedAt,
        manifestUrl: 'target',
      },
    ]);
  });
});

function extension(
  id: string,
  partial: Partial<WorkbenchExtensionDescription['manifest']> = {},
): WorkbenchExtensionDescription {
  return {
    manifest: {
      schemaVersion: 1,
      activationEvents: [],
      displayName: id,
      engines: {
        extensionApi: '^0.0.0',
        workbench: '^0.0.0',
      },
      id,
      name: id,
      publisher: 'workbench-kit',
      version: '0.0.0',
      ...partial,
    },
  };
}
