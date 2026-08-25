import { describe, expect, it, vi } from 'vitest';
import {
  ExtensionRegistry,
  type InstalledExtensionRecord,
  type WorkbenchExtensionDescription,
  type WorkbenchStorageAdapter,
} from '@workbench-kit/workbench-core';

import { ExtensionEnablementController } from './extension-enablement-controller.js';
import { createThemeSelectionProtectionSnapshot } from './theme-selection-protection.js';

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
  initializeProtection = true,
}: {
  accepted?: boolean;
  availableExtensions?: readonly WorkbenchExtensionDescription[];
  enabled: boolean;
  failWrites?: boolean;
  initializeProtection?: boolean;
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
  if (initializeProtection) {
    setKnownUnselectedTheme(controller, registry);
  }
  return { controller, diagnostics, persistence, registry };
}

function setKnownUnselectedTheme(
  controller: ExtensionEnablementController,
  registry: ExtensionRegistry,
): () => void {
  return controller.setThemeSelectionProtection(
    createThemeSelectionProtectionSnapshot({
      darkPreset: undefined,
      lightPreset: undefined,
      theme: 'workbench-kit.test.host-theme',
      themeOptions: [{ id: 'workbench-kit.test.host-theme', label: 'Host theme' }],
      themes: registry.themes,
    }),
  );
}

function setKnownSelectedTheme(
  controller: ExtensionEnablementController,
  registry: ExtensionRegistry,
): () => void {
  return controller.setThemeSelectionProtection(
    createThemeSelectionProtectionSnapshot({
      darkPreset: undefined,
      lightPreset: undefined,
      theme: 'workbench-kit.samples.theme-alt.dark-blue',
      themeOptions: undefined,
      themes: registry.themes,
    }),
  );
}

describe('ExtensionEnablementController', () => {
  it('enables and disables an unselected declarative theme without a reload', () => {
    const { controller, persistence, registry } = createHarness({
      enabled: false,
      initializeProtection: false,
    });
    const changes: string[] = [];
    registry.themes.onDidChangeThemes(({ kind, theme }) => changes.push(`${kind}:${theme.id}`));
    const disposeInitialProtection = setKnownUnselectedTheme(controller, registry);

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, true)).toMatchObject({
      enabled: true,
      kind: 'applied',
    });
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeDefined();
    expect(controller.getInstalledRecordsSnapshot()[0]?.enabled).toBe(true);

    disposeInitialProtection();
    setKnownUnselectedTheme(controller, registry);

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
    [
      'selected theme',
      {
        darkPreset: undefined,
        lightPreset: undefined,
        theme: 'workbench-kit.samples.theme-alt.dark-blue',
        themeOptions: undefined,
      },
    ],
    [
      'selected dark preset',
      {
        darkPreset: 'workbench-kit.samples.theme-alt.dark-blue',
        lightPreset: 'skyblue',
        theme: 'system',
        themeOptions: undefined,
      },
    ],
  ])('requires reload for a known %s', (_label, selection) => {
    const { controller, persistence, registry } = createHarness({ enabled: true });
    controller.setThemeSelectionProtection(
      createThemeSelectionProtectionSnapshot({ ...selection, themes: registry.themes }),
    );

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: false,
      kind: 'reloadRequired',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
    expect(JSON.parse(persistence.values.get(STORAGE_KEY) ?? '[]')[0]?.enabled).toBe(false);
  });

  it('protects the union of selected and unselected shell owners from the same provider', () => {
    const { controller, persistence, registry } = createHarness({
      enabled: true,
      initializeProtection: false,
    });
    setKnownSelectedTheme(controller, registry);
    setKnownUnselectedTheme(controller, registry);

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: false,
      kind: 'reloadRequired',
    });
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeDefined();
    expect(JSON.parse(persistence.values.get(STORAGE_KEY) ?? '[]')[0]?.enabled).toBe(false);
  });

  it('restores an older selected shell owner after the current owner is disposed', () => {
    const { controller, registry } = createHarness({
      enabled: true,
      initializeProtection: false,
    });
    setKnownSelectedTheme(controller, registry);
    const disposeCurrentOwner = setKnownUnselectedTheme(controller, registry);

    disposeCurrentOwner();

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: false,
      kind: 'reloadRequired',
    });
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeDefined();
  });

  it('keeps the current unselected shell owner after an older owner is disposed', () => {
    const { controller, registry } = createHarness({
      enabled: true,
      initializeProtection: false,
    });
    const disposeOlderOwner = setKnownSelectedTheme(controller, registry);
    setKnownUnselectedTheme(controller, registry);

    disposeOlderOwner();

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: false,
      kind: 'applied',
    });
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeUndefined();
  });

  it('fails closed while any live shell owner has unknown selection state', () => {
    const { controller, persistence, registry } = createHarness({
      enabled: true,
      initializeProtection: false,
    });
    setKnownUnselectedTheme(controller, registry);
    const disposeUnknownOwner = controller.setThemeSelectionProtection(
      createThemeSelectionProtectionSnapshot({
        darkPreset: undefined,
        lightPreset: undefined,
        theme: 'workbench-kit.test.missing-theme',
        themeOptions: undefined,
        themes: registry.themes,
      }),
    );

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: true,
      kind: 'reloadRequired',
    });
    expect(persistence.setItem).not.toHaveBeenCalled();

    disposeUnknownOwner();
    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: false,
      kind: 'applied',
    });
  });

  it('fails closed while any live shell owner has a stale catalog snapshot', () => {
    const { controller, persistence, registry } = createHarness({
      enabled: true,
      initializeProtection: false,
    });
    const staleSnapshot = createThemeSelectionProtectionSnapshot({
      darkPreset: undefined,
      lightPreset: undefined,
      theme: 'workbench-kit.test.stale-host-theme',
      themeOptions: [{ id: 'workbench-kit.test.stale-host-theme', label: 'Stale host theme' }],
      themes: registry.themes,
    });
    const unrelatedRegistration = registry.themes.registerTheme({
      extensionId: 'workbench-kit.test.unrelated-theme',
      id: 'workbench-kit.test.unrelated-theme.light',
      label: 'Unrelated Light',
      mode: 'light',
    });
    setKnownUnselectedTheme(controller, registry);
    const disposeStaleOwner = controller.setThemeSelectionProtection(staleSnapshot);

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: true,
      kind: 'reloadRequired',
    });
    expect(persistence.setItem).not.toHaveBeenCalled();

    disposeStaleOwner();
    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: false,
      kind: 'applied',
    });
    unrelatedRegistration.dispose();
  });

  it.each([
    [
      'unknown primary selection with a contributed first-option fallback',
      {
        darkPreset: undefined,
        lightPreset: undefined,
        theme: 'workbench-kit.missing.theme',
        themeOptions: undefined,
      },
    ],
    [
      'unknown color scheme selection',
      {
        darkPreset: 'workbench-kit.samples.theme-alt.dark-blue',
        lightPreset: 'skyblue',
        theme: 'contrast',
        themeOptions: undefined,
      },
    ],
    [
      'unknown preset selection',
      {
        darkPreset: 'workbench-kit.missing.dark',
        lightPreset: 'skyblue',
        theme: 'system',
        themeOptions: undefined,
      },
    ],
    [
      'ambiguous selected theme source',
      {
        darkPreset: undefined,
        lightPreset: undefined,
        theme: 'workbench-kit.samples.theme-alt.dark-blue',
        themeOptions: [
          {
            id: 'workbench-kit.samples.theme-alt.dark-blue',
            label: 'Conflicting host theme',
          },
        ],
      },
    ],
  ])('fails closed without mutating for %s', (_label, selection) => {
    const { controller, persistence, registry } = createHarness({ enabled: true });
    const changes: string[] = [];
    registry.themes.onDidChangeThemes(({ kind, theme }) => changes.push(`${kind}:${theme.id}`));
    const snapshot = createThemeSelectionProtectionSnapshot({
      ...selection,
      themes: registry.themes,
    });
    expect(snapshot.kind).toBe('unknown');
    controller.setThemeSelectionProtection(snapshot);

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: true,
      kind: 'reloadRequired',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeDefined();
    expect(controller.getInstalledRecordsSnapshot()).toEqual([installedRecord(true)]);
    expect(persistence.setItem).not.toHaveBeenCalled();
    expect(changes).toEqual([]);
  });

  it('fails closed before registering an unselected target when selection is unknown', () => {
    const { controller, persistence, registry } = createHarness({ enabled: false });
    controller.setThemeSelectionProtection(
      createThemeSelectionProtectionSnapshot({
        darkPreset: undefined,
        lightPreset: undefined,
        theme: 'workbench-kit.test.missing-theme',
        themeOptions: [{ id: 'workbench-kit.test.fallback-theme', label: 'Fallback theme' }],
        themes: registry.themes,
      }),
    );

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, true)).toMatchObject({
      enabled: false,
      kind: 'reloadRequired',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeUndefined();
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeUndefined();
    expect(controller.getInstalledRecordsSnapshot()).toEqual([installedRecord(false)]);
    expect(persistence.setItem).not.toHaveBeenCalled();
  });

  it('fails closed when a known selection snapshot is stale', () => {
    const { controller, persistence, registry } = createHarness({ enabled: true });
    const staleSnapshot = createThemeSelectionProtectionSnapshot({
      darkPreset: undefined,
      lightPreset: undefined,
      theme: 'workbench-kit.test.host-theme',
      themeOptions: [{ id: 'workbench-kit.test.host-theme', label: 'Host theme' }],
      themes: registry.themes,
    });
    const unrelatedRegistration = registry.themes.registerTheme({
      extensionId: 'workbench-kit.test.unrelated-theme',
      id: 'workbench-kit.test.unrelated-theme.light',
      label: 'Unrelated Light',
      mode: 'light',
    });
    controller.setThemeSelectionProtection(staleSnapshot);

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: true,
      kind: 'reloadRequired',
    });
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeDefined();
    expect(controller.getInstalledRecordsSnapshot()).toEqual([installedRecord(true)]);
    expect(persistence.setItem).not.toHaveBeenCalled();

    unrelatedRegistration.dispose();
  });

  it('fails closed when registered theme own data drifts without a registry revision', () => {
    const { controller, persistence, registry } = createHarness({ enabled: true });
    const selectedHostOptions = [{ id: 'workbench-kit.test.host-theme', label: 'Host theme' }];
    controller.setThemeSelectionProtection(
      createThemeSelectionProtectionSnapshot({
        darkPreset: undefined,
        lightPreset: undefined,
        theme: selectedHostOptions[0].id,
        themeOptions: selectedHostOptions,
        themes: registry.themes,
      }),
    );
    const capturedRevision = registry.themes.getRevision();
    const mutableTheme = registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue') as {
      label: string;
    };
    mutableTheme.label = 'Mutated without an event';

    expect(registry.themes.getRevision()).toBe(capturedRevision);
    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: true,
      kind: 'reloadRequired',
    });
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeDefined();
    expect(persistence.setItem).not.toHaveBeenCalled();
  });

  it('fails closed when host option own data drifts without a registry revision', () => {
    const { controller, persistence, registry } = createHarness({ enabled: true });
    const hostOptions = [{ id: 'workbench-kit.test.host-theme', label: 'Host theme' }];
    controller.setThemeSelectionProtection(
      createThemeSelectionProtectionSnapshot({
        darkPreset: undefined,
        lightPreset: undefined,
        theme: hostOptions[0].id,
        themeOptions: hostOptions,
        themes: registry.themes,
      }),
    );
    const capturedRevision = registry.themes.getRevision();
    hostOptions[0].label = 'Mutated host theme';

    expect(registry.themes.getRevision()).toBe(capturedRevision);
    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: true,
      kind: 'reloadRequired',
    });
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeDefined();
    expect(persistence.setItem).not.toHaveBeenCalled();
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

  it('requires reload without persistence when selection ownership is unavailable', () => {
    const { controller, persistence, registry } = createHarness({ enabled: true });
    controller.setThemeSelectionProtection(undefined);

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      enabled: true,
      kind: 'reloadRequired',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
    expect(controller.getInstalledRecordsSnapshot()).toEqual([installedRecord(true)]);
    expect(persistence.setItem).not.toHaveBeenCalled();
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
    controller.setThemeSelectionProtection(
      createThemeSelectionProtectionSnapshot({
        darkPreset: undefined,
        lightPreset: undefined,
        theme: 'workbench-kit.test.host-theme',
        themeOptions: [{ id: 'workbench-kit.test.host-theme', label: 'Host theme' }],
        themes: registry.themes,
      }),
    );

    expect(controller.toggleInstalledExtension(themeExtension.manifest.id, false)).toMatchObject({
      kind: 'reloadRequired',
    });
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
  });

  it('rechecks a stale uninstall action and blocks a newly persisted dependent', () => {
    const dependent: WorkbenchExtensionDescription = {
      manifest: {
        ...themeExtension.manifest,
        contributes: undefined,
        displayName: 'Persisted Dependent',
        extensionDependencies: [themeExtension.manifest.id],
        id: 'workbench-kit.test.persisted-dependent',
        name: 'persisted-dependent',
      },
    };
    const targetRecord = installedRecord(true);
    const dependentRecord: InstalledExtensionRecord = {
      category: 'utility',
      enabled: false,
      id: dependent.manifest.id,
      installedAt: '2026-08-22T00:00:00.000Z',
      manifestUrl: dependent.manifest.id,
    };
    const persistence = createMemoryStorage([targetRecord]);
    const registry = new ExtensionRegistry();
    const registrationLifetime = registry.registerExtensions([themeExtension]);
    const controller = new ExtensionEnablementController({
      availableExtensions: [themeExtension, dependent],
      initialEnabledExtensions: [themeExtension],
      initialInstalledRecords: [targetRecord],
      installedExtensionsStorage: persistence.storage,
      installedExtensionsStorageKey: STORAGE_KEY,
      integrityAcceptedExtensionIds: new Set([themeExtension.manifest.id, dependent.manifest.id]),
      registrationLifetime,
      registry,
    });
    persistence.values.set(STORAGE_KEY, JSON.stringify([targetRecord, dependentRecord]));

    expect(controller.uninstallInstalledExtension(themeExtension.manifest.id)).toEqual({
      dependentExtensionIds: [dependent.manifest.id],
      extensionId: themeExtension.manifest.id,
      kind: 'blocked',
      unresolvedExtensionIds: [],
    });
    expect(persistence.setItem).not.toHaveBeenCalled();
    expect(JSON.parse(persistence.values.get(STORAGE_KEY) ?? '[]')).toEqual([
      targetRecord,
      dependentRecord,
    ]);
    expect(controller.getInstalledRecordsSnapshot()).toEqual([targetRecord]);
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
  });

  it('fails closed on unresolved persisted manifest evidence', () => {
    const targetRecord = installedRecord(true);
    const unresolvedRecord: InstalledExtensionRecord = {
      category: 'utility',
      enabled: true,
      id: 'workbench-kit.test.unresolved',
      installedAt: '2026-08-22T00:00:00.000Z',
      manifestUrl: 'workbench-kit.test.unresolved',
    };
    const persistence = createMemoryStorage([targetRecord, unresolvedRecord]);
    const registry = new ExtensionRegistry();
    const registrationLifetime = registry.registerExtensions([themeExtension]);
    const controller = new ExtensionEnablementController({
      availableExtensions: [themeExtension],
      initialEnabledExtensions: [themeExtension],
      initialInstalledRecords: [targetRecord, unresolvedRecord],
      installedExtensionsStorage: persistence.storage,
      installedExtensionsStorageKey: STORAGE_KEY,
      integrityAcceptedExtensionIds: new Set([themeExtension.manifest.id]),
      registrationLifetime,
      registry,
    });

    expect(controller.uninstallInstalledExtension(themeExtension.manifest.id)).toEqual({
      dependentExtensionIds: [],
      extensionId: themeExtension.manifest.id,
      kind: 'blocked',
      unresolvedExtensionIds: [unresolvedRecord.id],
    });
    expect(persistence.setItem).not.toHaveBeenCalled();
    expect(controller.getInstalledRecordsSnapshot()).toEqual([targetRecord, unresolvedRecord]);
  });

  it('returns the target ID when an action-time record is no longer installed', () => {
    const { controller, persistence } = createHarness({ enabled: true });
    persistence.values.set(STORAGE_KEY, '[]');

    expect(controller.uninstallInstalledExtension(themeExtension.manifest.id)).toEqual({
      diagnosticExtensionIds: [themeExtension.manifest.id],
      extensionId: themeExtension.manifest.id,
      kind: 'ineligibleTarget',
      reason: 'notInstalled',
    });
    expect(persistence.setItem).not.toHaveBeenCalled();
  });

  it('commits a safe uninstall without tearing down the live registration', () => {
    const { controller, persistence, registry } = createHarness({ enabled: true });

    expect(controller.uninstallInstalledExtension(themeExtension.manifest.id)).toMatchObject({
      enabled: false,
      kind: 'reloadRequired',
    });
    expect(persistence.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(persistence.values.get(STORAGE_KEY) ?? 'null')).toEqual([]);
    expect(controller.getInstalledRecordsSnapshot()).toEqual([]);
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
    expect(registry.themes.getTheme('workbench-kit.samples.theme-alt.dark-blue')).toBeDefined();
  });

  it('commits a safe uninstall from a catalog-only live description', () => {
    const record = installedRecord(true);
    const persistence = createMemoryStorage([record]);
    const registry = new ExtensionRegistry();
    const registrationLifetime = registry.registerExtensions([themeExtension]);
    const controller = new ExtensionEnablementController({
      availableExtensions: [],
      initialEnabledExtensions: [themeExtension],
      initialInstalledRecords: [record],
      installedExtensionsStorage: persistence.storage,
      installedExtensionsStorageKey: STORAGE_KEY,
      integrityAcceptedExtensionIds: new Set(),
      registrationLifetime,
      registry,
    });

    expect(controller.uninstallInstalledExtension(themeExtension.manifest.id)).toMatchObject({
      extensionId: themeExtension.manifest.id,
      kind: 'reloadRequired',
    });
    expect(persistence.setItem).toHaveBeenCalledTimes(1);
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
  });

  it('fails closed when available and current live descriptions conflict', () => {
    const conflictingLive = {
      ...themeExtension,
      manifest: { ...themeExtension.manifest, displayName: 'Conflicting Live Theme' },
    };
    const record = installedRecord(true);
    const persistence = createMemoryStorage([record]);
    const registry = new ExtensionRegistry();
    const registrationLifetime = registry.registerExtensions([conflictingLive]);
    const controller = new ExtensionEnablementController({
      availableExtensions: [themeExtension],
      initialEnabledExtensions: [conflictingLive],
      initialInstalledRecords: [record],
      installedExtensionsStorage: persistence.storage,
      installedExtensionsStorageKey: STORAGE_KEY,
      integrityAcceptedExtensionIds: new Set([themeExtension.manifest.id]),
      registrationLifetime,
      registry,
    });

    expect(controller.uninstallInstalledExtension(themeExtension.manifest.id)).toEqual({
      dependentExtensionIds: [],
      extensionId: themeExtension.manifest.id,
      kind: 'blocked',
      unresolvedExtensionIds: [themeExtension.manifest.id],
    });
    expect(persistence.setItem).not.toHaveBeenCalled();
    expect(registry.getExtension(themeExtension.manifest.id)).toBeDefined();
  });

  it('uses a current catalog-only dependent for the action-time decision', () => {
    const dependent: WorkbenchExtensionDescription = {
      manifest: {
        ...themeExtension.manifest,
        contributes: undefined,
        displayName: 'Live Catalog Dependent',
        extensionDependencies: [themeExtension.manifest.id],
        id: 'workbench-kit.test.live-dependent',
        name: 'live-dependent',
      },
    };
    const targetRecord = installedRecord(true);
    const dependentRecord: InstalledExtensionRecord = {
      category: 'utility',
      enabled: true,
      id: dependent.manifest.id,
      installedAt: '2026-08-22T00:00:00.000Z',
      manifestUrl: dependent.manifest.id,
    };
    const persistence = createMemoryStorage([targetRecord, dependentRecord]);
    const registry = new ExtensionRegistry();
    const registrationLifetime = registry.registerExtensions([themeExtension]);
    const dependentRegistration = registry.registerExtension(dependent);
    const controller = new ExtensionEnablementController({
      availableExtensions: [themeExtension],
      initialEnabledExtensions: [themeExtension],
      initialInstalledRecords: [targetRecord, dependentRecord],
      installedExtensionsStorage: persistence.storage,
      installedExtensionsStorageKey: STORAGE_KEY,
      integrityAcceptedExtensionIds: new Set([themeExtension.manifest.id]),
      registrationLifetime,
      registry,
    });

    expect(controller.uninstallInstalledExtension(themeExtension.manifest.id)).toEqual({
      dependentExtensionIds: [dependent.manifest.id],
      extensionId: themeExtension.manifest.id,
      kind: 'blocked',
      unresolvedExtensionIds: [],
    });
    expect(persistence.setItem).not.toHaveBeenCalled();
    dependentRegistration.dispose();
  });
});
