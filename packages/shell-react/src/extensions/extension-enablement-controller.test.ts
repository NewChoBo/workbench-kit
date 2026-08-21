import { describe, expect, it, vi } from 'vitest';
import {
  ExtensionRegistry,
  type InstalledExtensionRecord,
  type WorkbenchExtensionDescription,
  type WorkbenchStorageAdapter,
} from '@workbench-kit/workbench-core';

import { ExtensionEnablementController } from './extension-enablement-controller.js';

const STORAGE_KEY = 'workbench-kit/.workbench/installed-extensions/theme-lifecycle-test';

const themeExtension: WorkbenchExtensionDescription = {
  manifest: {
    schemaVersion: 1,
    id: 'workbench-kit.samples.theme-alt',
    name: 'samples-theme-alt',
    displayName: 'Alternate Theme Pack',
    version: '0.0.0',
    publisher: 'workbench-kit',
    engines: { workbench: '^0.0.0', extensionApi: '^0.0.0' },
    activationEvents: [],
    contributes: {
      themes: [
        {
          id: 'workbench-kit.samples.theme-alt.dark-blue',
          label: 'Dark Blue Alt',
          mode: 'dark',
        },
      ],
    },
  },
};

function installedRecord(enabled: boolean): InstalledExtensionRecord {
  return {
    category: 'theme',
    enabled,
    id: themeExtension.manifest.id,
    installedAt: '2026-08-22T00:00:00.000Z',
    manifestUrl: themeExtension.manifest.id,
  };
}

function createMemoryStorage(
  initialRecords: readonly InstalledExtensionRecord[],
  failWrites = false,
) {
  const values = new Map([[STORAGE_KEY, JSON.stringify(initialRecords)]]);
  const setItem = vi.fn((key: string, value: string) => {
    if (failWrites) {
      throw new Error('private backend detail');
    }
    values.set(key, value);
  });
  const storage: WorkbenchStorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem,
  };
  return { setItem, storage, values };
}

function createHarness({
  accepted = true,
  availableExtensions = [themeExtension],
  enabled,
  failWrites = false,
}: {
  accepted?: boolean;
  availableExtensions?: readonly WorkbenchExtensionDescription[];
  enabled: boolean;
  failWrites?: boolean;
}) {
  const record = installedRecord(enabled);
  const persistence = createMemoryStorage([record], failWrites);
  const registry = new ExtensionRegistry();
  const initialEnabledExtensions = enabled ? [themeExtension] : [];
  const registrationLifetime = registry.registerExtensions(initialEnabledExtensions);
  const diagnostics = vi.fn();
  const controller = new ExtensionEnablementController({
    availableExtensions,
    initialEnabledExtensions,
    initialInstalledRecords: [record],
    installedExtensionsStorage: persistence.storage,
    installedExtensionsStorageKey: STORAGE_KEY,
    integrityAcceptedExtensionIds: new Set(
      accepted ? availableExtensions.map((item) => item.manifest.id) : [],
    ),
    onPersistenceDiagnostic: diagnostics,
    registrationLifetime,
    registry,
  });
  controller.setProtectedThemeIds([]);
  return { controller, diagnostics, persistence, registry };
}

describe('ExtensionEnablementController', () => {
  it('enables and disables an unselected declarative theme without a reload', () => {
    const { controller, persistence, registry } = createHarness({ enabled: false });
    const changes: string[] = [];
    registry.themes.onDidChangeThemes(({ kind, theme }) => changes.push(`${kind}:${theme.id}`));

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, true)).toMatchObject({
      enabled: true,
      kind: 'applied',
    });
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeDefined();
    expect(controller.getInstalledRecordsSnapshot()[0]?.enabled).toBe(true);

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: false,
      kind: 'applied',
    });
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeUndefined();
    expect(controller.getInstalledRecordsSnapshot()[0]?.enabled).toBe(false);
    expect(persistence.setItem).toHaveBeenCalledTimes(2);
    expect(changes).toEqual([
      'registered:workbench-kit.samples.theme-alt.dark-blue',
      'unregistered:workbench-kit.samples.theme-alt.dark-blue',
    ]);
  });

  it('rolls back runtime and projection when enable persistence fails', () => {
    const { controller, diagnostics, registry } = createHarness({
      enabled: false,
      failWrites: true,
    });

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, true)).toMatchObject({
      enabled: false,
      kind: 'failed',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeUndefined();
    expect(registry.themes.getThemes()).toEqual([]);
    expect(controller.getInstalledRecordsSnapshot()).toEqual([installedRecord(false)]);
    expect(diagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'write_failed', storageKey: STORAGE_KEY }),
    );
  });

  it('restores runtime and projection when disable persistence fails', () => {
    const { controller, registry } = createHarness({ enabled: true, failWrites: true });

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: true,
      kind: 'failed',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeDefined();
    expect(controller.getInstalledRecordsSnapshot()).toEqual([installedRecord(true)]);
  });

  it.each([
    ['selected theme', [themeExtension.manifest.contributes?.themes?.[0]?.id]],
    ['selected light preset', ['workbench-kit.samples.theme-alt.dark-blue', 'workbench.light']],
    ['selected dark preset', ['workbench.dark', 'workbench-kit.samples.theme-alt.dark-blue']],
  ])('requires reload for a protected %s', (_label, protectedThemeIds) => {
    const { controller, persistence, registry } = createHarness({ enabled: true });
    controller.setProtectedThemeIds(protectedThemeIds);

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: false,
      kind: 'reloadRequired',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
    expect(JSON.parse(persistence.values.get(STORAGE_KEY) ?? '[]')[0]?.enabled).toBe(false);
  });

  it.each([
    [
      'localization contribution',
      {
        ...themeExtension,
        manifest: {
          ...themeExtension.manifest,
          contributes: {
            ...themeExtension.manifest.contributes,
            localizations: [{ label: 'French', locale: 'fr', translations: {} }],
          },
        },
      },
    ],
    ['executable module', { ...themeExtension, module: { activate: () => undefined } }],
    [
      'capability',
      {
        ...themeExtension,
        manifest: {
          ...themeExtension.manifest,
          capabilities: { provides: ['workbench.theme.dynamic'] },
        },
      },
    ],
    [
      'hard dependency',
      {
        ...themeExtension,
        manifest: {
          ...themeExtension.manifest,
          extensionDependencies: ['workbench-kit.builtin.base-theme'],
        },
      },
    ],
  ])('requires reload for a theme extension with %s', (_label, description) => {
    const { controller, persistence, registry } = createHarness({
      availableExtensions: [description],
      enabled: true,
    });

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      kind: 'reloadRequired',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
    expect(persistence.setItem).toHaveBeenCalledTimes(1);
  });

  it('requires reload when selection ownership is unavailable', () => {
    const { controller, registry } = createHarness({ enabled: true });
    controller.setProtectedThemeIds(undefined);

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      kind: 'reloadRequired',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
  });

  it('fails without persistence when integrity rejects the candidate', () => {
    const { controller, persistence, registry } = createHarness({
      accepted: false,
      enabled: false,
    });

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, true)).toMatchObject({
      enabled: false,
      kind: 'failed',
    });
    expect(persistence.setItem).not.toHaveBeenCalled();
    expect(registry.getExtension(themeExtension.manifest.id)).toBeUndefined();
  });

  it('keeps a hard-dependent registered theme on the reload path', () => {
    const dependent: WorkbenchExtensionDescription = {
      manifest: {
        ...themeExtension.manifest,
        id: 'workbench-kit.samples.theme-dependent',
        name: 'samples-theme-dependent',
        displayName: 'Theme Dependent',
        extensionDependencies: [themeExtension.manifest.id],
        contributes: undefined,
      },
    };
    const record = installedRecord(true);
    const persistence = createMemoryStorage([record]);
    const registry = new ExtensionRegistry();
    const registrationLifetime = registry.registerExtensions([themeExtension, dependent]);
    const controller = new ExtensionEnablementController({
      availableExtensions: [themeExtension, dependent],
      initialEnabledExtensions: [themeExtension, dependent],
      initialInstalledRecords: [record],
      installedExtensionsStorage: persistence.storage,
      installedExtensionsStorageKey: STORAGE_KEY,
      integrityAcceptedExtensionIds: new Set([themeExtension.manifest.id, dependent.manifest.id]),
      registrationLifetime,
      registry,
    });
    controller.setProtectedThemeIds([]);

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      kind: 'reloadRequired',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
  });
});
