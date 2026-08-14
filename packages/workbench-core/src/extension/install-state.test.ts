import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  ExtensionInstallApprovalRequiredError,
  applyExtensionInstallPlanToRecords,
  installExtensionRecord,
  loadInstalledExtensions,
  saveInstalledExtensions,
  saveInstalledExtensionsResult,
  toggleInstalledExtensionEnabled,
} from './install-state.js';
import {
  createExtensionInstallPlan,
  type WorkbenchExtensionDescription,
  type WorkbenchStorageAdapter,
} from '../index.js';

function createMemoryStorage(): WorkbenchStorageAdapter {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
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

  it('keeps strict saves throwing and exposes an additive recoverable result', () => {
    const records = [
      {
        category: 'utility',
        enabled: true,
        id: 'test.extension',
        installedAt: '2026-06-21T00:00:00.000Z',
        manifestUrl: 'test.extension',
      },
    ];
    const storage = {
      setItem() {
        throw new Error('quota exceeded at a private backend path');
      },
    };

    expect(() =>
      saveInstalledExtensions(records, 'workbench-kit/.workbench/strict', storage),
    ).toThrow('quota exceeded');

    const diagnostics: unknown[] = [];
    const result = saveInstalledExtensionsResult(
      records,
      'workbench-kit/.workbench/recoverable',
      storage,
      { onDiagnostic: (diagnostic) => diagnostics.push(diagnostic) },
    );
    expect(result).toEqual({
      committed: false,
      diagnostic: {
        code: 'write_failed',
        message: 'Workbench storage value could not be written.',
        operation: 'write',
        storageKey: 'workbench-kit/.workbench/recoverable',
      },
    });
    expect(diagnostics).toEqual([result.diagnostic]);
  });

  it('does not write when toggling an extension id that is not installed', () => {
    const storageKey = 'workbench-kit/.workbench/toggle-no-op';
    const records = [
      {
        category: 'utility',
        enabled: false,
        id: 'installed.extension',
        installedAt: '2026-06-21T00:00:00.000Z',
        manifestUrl: 'installed.extension',
      },
    ];
    let writes = 0;
    const storage: WorkbenchStorageAdapter = {
      getItem: () => JSON.stringify(records),
      setItem() {
        writes += 1;
        throw new Error('no-op toggle must not write');
      },
    };

    expect(toggleInstalledExtensionEnabled('missing.extension', true, storageKey, storage)).toEqual(
      records,
    );
    expect(writes).toBe(0);
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

  it('refuses install/enable actions outside the enterprise allowlist', () => {
    const installSources = [
      {
        category: 'utility',
        id: 'blocked-ext',
        manifestUrl: 'blocked-ext',
      },
    ];
    const plan = createExtensionInstallPlan({
      availableExtensions: [extension('blocked-ext')],
      installSources,
      installedRecords: [],
      targetExtensionId: 'blocked-ext',
    });

    expect(() =>
      applyExtensionInstallPlanToRecords({
        allowlistPolicy: { allowedExtensionIds: ['other.ext'] },
        currentRecords: [],
        installSources,
        plan,
      }),
    ).toThrow(/not on the host enterprise allowlist/i);
  });

  it('refuses plans that require approval until approved is true', () => {
    const installSources = [
      {
        category: 'utility',
        id: 'privileged',
        manifestUrl: 'privileged',
      },
    ];
    const plan = createExtensionInstallPlan({
      availableExtensions: [
        extension('privileged', {
          permissions: ['workspace.write'],
        }),
      ],
      installSources,
      installedRecords: [],
      targetExtensionId: 'privileged',
    });

    expect(plan.requiresApproval).toBe(true);
    expect(plan.blocked).toBe(false);

    expect(() =>
      applyExtensionInstallPlanToRecords({
        currentRecords: [],
        installSources,
        plan,
      }),
    ).toThrow(ExtensionInstallApprovalRequiredError);

    expect(
      applyExtensionInstallPlanToRecords({
        approved: true,
        currentRecords: [],
        installSources,
        installedAt: '2026-06-21T00:00:00.000Z',
        plan,
      }),
    ).toEqual([
      {
        category: 'utility',
        enabled: true,
        id: 'privileged',
        installedAt: '2026-06-21T00:00:00.000Z',
        manifestUrl: 'privileged',
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
