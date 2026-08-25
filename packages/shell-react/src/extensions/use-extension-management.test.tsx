/** @vitest-environment jsdom */

import { act, StrictMode, useEffect, useReducer } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isExtensionInstallTrusted,
  recordExtensionInstallTrust,
  type WorkbenchExtensionDescription,
  type WorkbenchStorageAdapter,
} from '@workbench-kit/workbench-core';
import { resolveExtensionInstallOptions } from '@workbench-kit/react/workbench/management';

import { useWorkbench, WorkbenchProvider } from '../shell/provider.js';
import {
  useExtensionManagementModel,
  type UseExtensionManagementModelOptions,
} from './use-extension-management.js';
import { BUILTIN_WORKBENCH_EXTENSIONS } from './builtin-extensions.js';
import { useExtensionEnablementController } from './extension-enablement-context.js';
import { createThemeSelectionProtectionSnapshot } from './theme-selection-protection.js';
import { SAMPLE_WORKBENCH_EXTENSIONS } from '../../../../examples/workbench-sample/src/sample-extensions.js';

type ExtensionManagementModel = ReturnType<typeof useExtensionManagementModel>;

const catalogResponse = {
  entries: [
    {
      category: 'editor',
      description: 'Routes JSON workspace files to a preview-oriented editor contribution.',
      displayName: 'JSON Preview',
      icon: 'json',
      id: 'workbench-kit.samples.json-preview',
      manifestUrl: 'workbench-kit.samples.json-preview',
    },
  ],
  schemaVersion: 1,
};

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const authCapabilityHostPort = {
  applySave: () => undefined,
  capabilityId: 'workbench.auth',
  service: {},
};

const declarativeThemeExtension = {
  manifest: {
    schemaVersion: 1 as const,
    id: 'workbench-kit.samples.theme-soft-lifecycle',
    name: 'samples-theme-soft-lifecycle',
    displayName: 'Soft Lifecycle Theme',
    version: '0.0.0',
    publisher: 'workbench-kit',
    engines: { workbench: '^0.0.0', extensionApi: '^0.0.0' },
    activationEvents: [],
    contributes: {
      themes: [
        {
          id: 'workbench-kit.samples.theme-soft-lifecycle.dark',
          label: 'Soft Lifecycle Dark',
          mode: 'dark' as const,
        },
      ],
    },
  },
};

function createMemoryStorage(): WorkbenchStorageAdapter {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

function ExtensionManagementProbe({
  catalogUrl,
  onChange,
  options,
}: {
  catalogUrl?: string | undefined;
  onChange: (model: ExtensionManagementModel) => void;
  options?: Omit<UseExtensionManagementModelOptions, 'catalogUrl'> | undefined;
}) {
  const model = useExtensionManagementModel({ ...options, catalogUrl });

  useEffect(() => {
    onChange(model);
  }, [model, onChange]);

  return null;
}

function ThemeLifecycleManagementProbe({
  onChange,
}: {
  onChange: (model: ExtensionManagementModel) => void;
}) {
  const controller = useExtensionEnablementController();
  const { themes } = useWorkbench();
  const [themeRevision, bumpThemeRevision] = useReducer((revision: number) => revision + 1, 0);
  useEffect(() => themes.onDidChangeThemes(bumpThemeRevision).dispose, [themes]);
  useEffect(() => {
    return controller.setThemeSelectionProtection(
      createThemeSelectionProtectionSnapshot({
        darkPreset: undefined,
        lightPreset: undefined,
        theme: 'workbench-kit.test.host-theme',
        themeOptions: [{ id: 'workbench-kit.test.host-theme', label: 'Host theme' }],
        themes,
      }),
    );
  }, [controller, themeRevision, themes]);

  return <ExtensionManagementProbe catalogUrl="" onChange={onChange} />;
}

describe('useExtensionManagementModel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => catalogResponse,
        ok: true,
      })),
    );
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes catalog install and toggle actions through the host storage adapter', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'workbench-kit/.workbench/installed-extensions/test-host-storage';
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentModel: ExtensionManagementModel | undefined;

    await act(async () => {
      root.render(
        <StrictMode>
          <WorkbenchProvider
            availableExtensions={[...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS]}
            // Keep samples available for planning, but do not pre-enable them or
            // install becomes an already-enabled no-op with no storage write.
            extensionsConfig={{ enabled: [], recommendations: [] }}
            installedExtensionsStorage={storage}
            installedExtensionsStorageKey={storageKey}
            workspaceHostPort={authCapabilityHostPort}
          >
            <ExtensionManagementProbe
              catalogUrl="/extension-catalog.json"
              onChange={(model) => {
                currentModel = model;
              }}
            />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    await waitForModel(() => currentModel?.catalogLoading === false);
    const jsonPreview = currentModel?.browseEntries.find(
      (entry) => entry.id === 'workbench-kit.samples.json-preview',
    );
    expect(jsonPreview).toBeDefined();
    expect(jsonPreview?.installPlan).toMatchObject({ blocked: false });
    expect(jsonPreview?.installPlan?.installExtensionIds).toContain(
      'workbench-kit.samples.json-preview',
    );

    await act(async () => {
      // Sample catalog entries may declare permissions → requiresApproval.
      currentModel?.installCatalogEntry(jsonPreview!, { approved: true });
    });

    expect(JSON.parse(storage.getItem(storageKey) ?? '[]')).toMatchObject([
      {
        category: 'editor',
        enabled: true,
        id: 'workbench-kit.samples.json-preview',
        manifestUrl: 'workbench-kit.samples.json-preview',
      },
    ]);

    await act(async () => {
      currentModel?.toggleInstalledEntry(
        {
          category: 'editor',
          description: 'Routes JSON workspace files to a preview-oriented editor contribution.',
          displayName: 'JSON Preview',
          enabled: true,
          id: 'workbench-kit.samples.json-preview',
          manifestUrl: 'workbench-kit.samples.json-preview',
          source: 'installed',
        },
        false,
      );
    });

    expect(JSON.parse(storage.getItem(storageKey) ?? '[]')).toMatchObject([
      {
        enabled: false,
        id: 'workbench-kit.samples.json-preview',
      },
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it('shares the provider snapshot and applies an eligible theme toggle without reload', async () => {
    const storage = createMemoryStorage();
    const storageKey = 'workbench-kit/.workbench/installed-extensions/theme-soft-lifecycle';
    storage.setItem(
      storageKey,
      JSON.stringify([
        {
          category: 'theme',
          enabled: false,
          id: declarativeThemeExtension.manifest.id,
          installedAt: '2026-08-22T00:00:00.000Z',
          manifestUrl: declarativeThemeExtension.manifest.id,
        },
      ]),
    );
    const requestAnimationFrame = vi.mocked(window.requestAnimationFrame);
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentModel: ExtensionManagementModel | undefined;

    await act(async () => {
      root.render(
        <WorkbenchProvider
          availableExtensions={[declarativeThemeExtension]}
          extensionsConfig={{ enabled: [], recommendations: [] }}
          installedExtensionsStorage={storage}
          installedExtensionsStorageKey={storageKey}
        >
          <ThemeLifecycleManagementProbe
            onChange={(model) => {
              currentModel = model;
            }}
          />
        </WorkbenchProvider>,
      );
    });

    await waitForModel(
      () => currentModel?.installedEntries[0]?.id === declarativeThemeExtension.manifest.id,
    );
    await act(async () => {
      currentModel?.toggleInstalledEntry(currentModel.installedEntries[0]!, true);
    });

    await waitForModel(() => currentModel?.installedEntries[0]?.enabled === true);
    expect(currentModel?.installedEntries[0]?.transition).toMatchObject({ kind: 'applied' });
    expect(JSON.parse(storage.getItem(storageKey) ?? '[]')[0]?.enabled).toBe(true);
    expect(currentModel?.pendingAction).toBeUndefined();
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    await act(async () => {
      currentModel?.toggleInstalledEntry(currentModel.installedEntries[0]!, false);
    });
    await waitForModel(() => currentModel?.installedEntries[0]?.enabled === false);
    expect(currentModel?.installedEntries[0]?.transition).toMatchObject({ kind: 'applied' });
    expect(JSON.parse(storage.getItem(storageKey) ?? '[]')[0]?.enabled).toBe(false);
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    await act(async () => root.unmount());
  });

  it('commits uninstall before projection and retains install trust across remount', async () => {
    const installedStorage = createMemoryStorage();
    const trustStorage = createMemoryStorage();
    const storageKey = 'workbench-kit/.workbench/installed-extensions/uninstall-success';
    const trustStorageKey = 'workbench-kit/.workbench/extension-install-trust/uninstall-success';
    const installedRecord = {
      category: 'editor',
      enabled: true,
      id: 'workbench-kit.samples.json-preview',
      installedAt: '2026-08-22T00:00:00.000Z',
      manifestUrl: 'workbench-kit.samples.json-preview',
    };
    const trustRecords = recordExtensionInstallTrust(
      installedRecord.id,
      ['workspace.write'],
      [],
      '2026-08-22T00:00:00.000Z',
    );
    installedStorage.setItem(storageKey, JSON.stringify([installedRecord]));
    trustStorage.setItem(trustStorageKey, JSON.stringify(trustRecords));
    const requestAnimationFrame = vi.mocked(window.requestAnimationFrame);
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentModel: ExtensionManagementModel | undefined;

    await act(async () => {
      root.render(
        <StrictMode>
          <WorkbenchProvider
            availableExtensions={[...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS]}
            extensionsConfig={{ enabled: [], recommendations: [] }}
            installedExtensionsStorage={installedStorage}
            installedExtensionsStorageKey={storageKey}
            workspaceHostPort={authCapabilityHostPort}
          >
            <ExtensionManagementProbe
              catalogUrl=""
              options={{
                installTrustStorage: trustStorage,
                installTrustStorageKey: trustStorageKey,
              }}
              onChange={(model) => {
                currentModel = model;
              }}
            />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    await waitForModel(
      () =>
        currentModel?.installedEntries.find((entry) => entry.id === installedRecord.id)
          ?.canUninstall === true,
    );
    const installedEntry = currentModel?.installedEntries.find(
      (entry) => entry.id === installedRecord.id,
    );
    expect(installedEntry).toBeDefined();
    expect(installedEntry?.canUninstall).toBe(true);

    await act(async () => {
      currentModel?.uninstallInstalledEntry(installedEntry!);
    });

    await waitForModel(() => currentModel?.pendingUninstallEntryId === installedRecord.id);
    expect(JSON.parse(installedStorage.getItem(storageKey) ?? 'null')).toEqual([]);
    expect(currentModel?.installedEntries).toContainEqual(installedEntry);
    expect(currentModel?.pendingAction).toBeUndefined();
    expect(currentModel?.pendingUninstallEntryId).toBe(installedRecord.id);
    expect(currentModel?.installTrustRecords).toEqual(trustRecords);
    expect(JSON.parse(trustStorage.getItem(trustStorageKey) ?? 'null')).toEqual(trustRecords);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });

    const remountContainer = document.createElement('div');
    const remountRoot = createRoot(remountContainer);
    let remountedModel: ExtensionManagementModel | undefined;
    await act(async () => {
      remountRoot.render(
        <StrictMode>
          <WorkbenchProvider
            availableExtensions={[...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS]}
            extensionsConfig={{ enabled: [], recommendations: [] }}
            installedExtensionsStorage={installedStorage}
            installedExtensionsStorageKey={storageKey}
            workspaceHostPort={authCapabilityHostPort}
          >
            <ExtensionManagementProbe
              catalogUrl=""
              options={{
                installTrustStorage: trustStorage,
                installTrustStorageKey: trustStorageKey,
              }}
              onChange={(model) => {
                remountedModel = model;
              }}
            />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    await waitForModel(() => remountedModel !== undefined);
    expect(remountedModel?.installedEntries.some((entry) => entry.id === installedRecord.id)).toBe(
      false,
    );
    expect(remountedModel?.installTrustRecords).toEqual(trustRecords);

    await act(async () => {
      remountRoot.unmount();
    });
  });

  it('keeps the installed projection when uninstall persistence fails', async () => {
    const storageKey = 'workbench-kit/.workbench/installed-extensions/uninstall-failure';
    const installedRecord = {
      category: 'editor',
      enabled: true,
      id: 'workbench-kit.samples.json-preview',
      installedAt: '2026-08-22T00:00:00.000Z',
      manifestUrl: 'workbench-kit.samples.json-preview',
    };
    const persisted = JSON.stringify([installedRecord]);
    const writer = vi.fn(() => {
      throw new Error('backend quota detail');
    });
    const storage: WorkbenchStorageAdapter = {
      getItem: (key) => (key === storageKey ? persisted : null),
      setItem: writer,
    };
    const diagnostics = vi.fn();
    const requestAnimationFrame = vi.mocked(window.requestAnimationFrame);
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentModel: ExtensionManagementModel | undefined;

    await act(async () => {
      root.render(
        <StrictMode>
          <WorkbenchProvider
            availableExtensions={[...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS]}
            extensionsConfig={{ enabled: [], recommendations: [] }}
            installedExtensionsStorage={storage}
            installedExtensionsStorageKey={storageKey}
            onPersistenceDiagnostic={diagnostics}
            workspaceHostPort={authCapabilityHostPort}
          >
            <ExtensionManagementProbe
              catalogUrl=""
              onChange={(model) => {
                currentModel = model;
              }}
            />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    await waitForModel(
      () =>
        currentModel?.installedEntries.find((entry) => entry.id === installedRecord.id)
          ?.canUninstall === true,
    );
    const installedEntry = currentModel?.installedEntries.find(
      (entry) => entry.id === installedRecord.id,
    );

    await act(async () => {
      currentModel?.uninstallInstalledEntry(installedEntry!);
    });

    expect(writer).toHaveBeenCalledTimes(1);
    expect(currentModel?.installedEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ canUninstall: true, id: installedRecord.id }),
      ]),
    );
    expect(currentModel?.pendingAction).toBeUndefined();
    expect(currentModel?.pendingUninstallEntryId).toBeUndefined();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(diagnostics).toHaveBeenCalledWith({
      code: 'write_failed',
      message: 'Workbench storage value could not be written.',
      operation: 'write',
      storageKey,
    });
    expect(JSON.stringify(diagnostics.mock.calls)).not.toContain('backend quota detail');

    await act(async () => {
      root.unmount();
    });
  });

  it('overlays an action-time diagnostic when a stale eligible record is missing', async () => {
    const storageKey = 'workbench-kit/.workbench/installed-extensions/uninstall-no-op';
    const installedRecord = {
      category: 'editor',
      enabled: true,
      id: 'workbench-kit.samples.json-preview',
      installedAt: '2026-08-22T00:00:00.000Z',
      manifestUrl: 'workbench-kit.samples.json-preview',
    };
    const values = new Map([[storageKey, JSON.stringify([installedRecord])]]);
    const writer = vi.fn((key: string, value: string) => {
      values.set(key, value);
    });
    const storage: WorkbenchStorageAdapter = {
      getItem: (key) => values.get(key) ?? null,
      setItem: writer,
    };
    const requestAnimationFrame = vi.mocked(window.requestAnimationFrame);
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentModel: ExtensionManagementModel | undefined;

    await act(async () => {
      root.render(
        <StrictMode>
          <WorkbenchProvider
            availableExtensions={[...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS]}
            extensionsConfig={{ enabled: [], recommendations: [] }}
            installedExtensionsStorage={storage}
            installedExtensionsStorageKey={storageKey}
            workspaceHostPort={authCapabilityHostPort}
          >
            <ExtensionManagementProbe
              catalogUrl=""
              onChange={(model) => {
                currentModel = model;
              }}
            />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    await waitForModel(
      () =>
        currentModel?.installedEntries.find((entry) => entry.id === installedRecord.id)
          ?.canUninstall === true,
    );
    const staleEligibleEntry = currentModel?.installedEntries.find(
      (entry) => entry.id === installedRecord.id,
    );
    const bundledEntry = currentModel?.installedEntries.find(
      (entry) => entry.id === 'workbench-kit.builtin.explorer',
    );
    expect(staleEligibleEntry).toBeDefined();
    expect(bundledEntry).toBeDefined();
    values.set(storageKey, '[]');

    await act(async () => {
      currentModel?.uninstallInstalledEntry(staleEligibleEntry!);
      currentModel?.uninstallInstalledEntry(bundledEntry!);
    });

    expect(writer).not.toHaveBeenCalled();
    expect(JSON.parse(values.get(storageKey) ?? 'null')).toEqual([]);
    const correctedEntry = currentModel?.installedEntries.find(
      (entry) => entry.id === installedRecord.id,
    );
    expect(correctedEntry).not.toHaveProperty('canUninstall');
    expect(correctedEntry?.diagnostics).toContainEqual({
      message:
        'Cannot uninstall because these persisted targets are no longer installed: workbench-kit.samples.json-preview.',
      severity: 'error',
    });
    expect(currentModel?.pendingAction).toBeUndefined();
    expect(currentModel?.pendingUninstallEntryId).toBeUndefined();
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it('corrects stale eligibility with action-time dependent diagnostics and no mutation', async () => {
    const storageKey = 'workbench-kit/.workbench/installed-extensions/uninstall-drift';
    const target = SAMPLE_WORKBENCH_EXTENSIONS.find(
      (extension) => extension.manifest.id === 'workbench-kit.samples.json-preview',
    )!;
    const dependent: WorkbenchExtensionDescription = {
      manifest: {
        ...target.manifest,
        activationEvents: [],
        displayName: 'Late Persisted Dependent',
        extensionDependencies: [target.manifest.id],
        id: 'workbench-kit.test.late-persisted-dependent',
        name: 'late-persisted-dependent',
      },
    };
    const targetRecord = {
      category: 'editor',
      enabled: true,
      id: target.manifest.id,
      installedAt: '2026-08-22T00:00:00.000Z',
      manifestUrl: target.manifest.id,
    };
    const dependentRecord = {
      category: 'utility',
      enabled: false,
      id: dependent.manifest.id,
      installedAt: '2026-08-22T00:00:00.000Z',
      manifestUrl: dependent.manifest.id,
    };
    const values = new Map([[storageKey, JSON.stringify([targetRecord])]]);
    const writer = vi.fn((key: string, value: string) => values.set(key, value));
    const storage: WorkbenchStorageAdapter = {
      getItem: (key) => values.get(key) ?? null,
      setItem: writer,
    };
    const requestAnimationFrame = vi.mocked(window.requestAnimationFrame);
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentModel: ExtensionManagementModel | undefined;

    await act(async () => {
      root.render(
        <StrictMode>
          <WorkbenchProvider
            availableExtensions={[...BUILTIN_WORKBENCH_EXTENSIONS, target, dependent]}
            extensionsConfig={{ enabled: [], recommendations: [] }}
            installedExtensionsStorage={storage}
            installedExtensionsStorageKey={storageKey}
            workspaceHostPort={authCapabilityHostPort}
          >
            <ExtensionManagementProbe
              catalogUrl=""
              onChange={(model) => {
                currentModel = model;
              }}
            />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    await waitForModel(
      () =>
        currentModel?.installedEntries.find((entry) => entry.id === target.manifest.id)
          ?.canUninstall === true,
    );
    const staleEligibleEntry = currentModel?.installedEntries.find(
      (entry) => entry.id === target.manifest.id,
    );
    values.set(storageKey, JSON.stringify([targetRecord, dependentRecord]));

    await act(async () => {
      currentModel?.uninstallInstalledEntry(staleEligibleEntry!);
    });

    const correctedEntry = currentModel?.installedEntries.find(
      (entry) => entry.id === target.manifest.id,
    );
    expect(correctedEntry).not.toHaveProperty('canUninstall');
    expect(correctedEntry?.diagnostics).toContainEqual({
      message:
        'Cannot uninstall because these installed extensions depend on it: workbench-kit.test.late-persisted-dependent.',
      severity: 'error',
    });
    expect(writer).not.toHaveBeenCalled();
    expect(currentModel?.installedEntries.some((entry) => entry.id === dependent.manifest.id)).toBe(
      false,
    );
    expect(currentModel?.pendingUninstallEntryId).toBeUndefined();
    expect(requestAnimationFrame).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it('rolls back a failed install projection and reloads only after a later commit', async () => {
    const values = new Map<string, string>();
    const storageKey = 'workbench-kit/.workbench/installed-extensions/recoverable-test';
    let failWrites = true;
    const storage: WorkbenchStorageAdapter = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        if (failWrites) {
          throw new Error('backend quota detail');
        }
        values.set(key, value);
      },
    };
    const diagnostics = vi.fn();
    const requestAnimationFrame = vi.mocked(window.requestAnimationFrame);
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentModel: ExtensionManagementModel | undefined;

    await act(async () => {
      root.render(
        <StrictMode>
          <WorkbenchProvider
            availableExtensions={[...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS]}
            extensionsConfig={{ enabled: [], recommendations: [] }}
            installedExtensionsStorage={storage}
            installedExtensionsStorageKey={storageKey}
            onPersistenceDiagnostic={diagnostics}
            workspaceHostPort={authCapabilityHostPort}
          >
            <ExtensionManagementProbe
              catalogUrl="/extension-catalog.json"
              onChange={(model) => {
                currentModel = model;
              }}
            />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    await waitForModel(() => currentModel?.catalogLoading === false);
    const jsonPreview = currentModel?.browseEntries.find(
      (entry) => entry.id === 'workbench-kit.samples.json-preview',
    );
    expect(jsonPreview).toBeDefined();

    await act(async () => {
      currentModel?.installCatalogEntry(jsonPreview!, { approved: true });
    });

    await waitForModel(() => diagnostics.mock.calls.length === 1);
    expect(
      currentModel?.installedEntries.some(
        (entry) => entry.id === 'workbench-kit.samples.json-preview',
      ),
    ).toBe(false);
    expect(currentModel?.pendingAction).toBeUndefined();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(diagnostics).toHaveBeenLastCalledWith({
      code: 'write_failed',
      message: 'Workbench storage value could not be written.',
      operation: 'write',
      storageKey,
    });
    expect(JSON.stringify(diagnostics.mock.calls)).not.toContain('backend quota detail');

    failWrites = false;
    await act(async () => {
      currentModel?.installCatalogEntry(jsonPreview!, { approved: true });
    });

    expect(JSON.parse(values.get(storageKey) ?? '[]')).toMatchObject([
      {
        enabled: true,
        id: 'workbench-kit.samples.json-preview',
      },
    ]);
    expect(
      currentModel?.installedEntries.find(
        (entry) => entry.id === 'workbench-kit.samples.json-preview',
      )?.enabled,
    ).toBe(true);
    expect(
      currentModel?.installedEntries.find(
        (entry) => entry.id === 'workbench-kit.samples.json-preview',
      )?.canUninstall,
    ).toBe(true);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });

  it('continues an approved install when remembered trust cannot be persisted', async () => {
    const permissionedExtensions = SAMPLE_WORKBENCH_EXTENSIONS.map((extension) =>
      extension.manifest.id === 'workbench-kit.samples.json-preview'
        ? {
            ...extension,
            manifest: {
              ...extension.manifest,
              permissions: ['workspace.write'],
            },
          }
        : extension,
    );
    const installedValues = new Map<string, string>();
    const installedStorageKey = 'workbench-kit/.workbench/installed-extensions/trust-recovery';
    const trustStorageKey = 'workbench-kit/.workbench/extension-install-trust/recovery';
    const installedWriter = vi.fn((key: string, value: string) => {
      installedValues.set(key, value);
    });
    const trustWriter = vi.fn(() => {
      throw new Error('BACKEND_SENSITIVE_DETAIL');
    });
    const installedStorage: WorkbenchStorageAdapter = {
      getItem: (key) => installedValues.get(key) ?? null,
      setItem: installedWriter,
    };
    const trustStorage: WorkbenchStorageAdapter = {
      getItem: () => null,
      setItem: trustWriter,
    };
    const diagnostics = vi.fn();
    const requestAnimationFrame = vi.mocked(window.requestAnimationFrame);
    const container = document.createElement('div');
    const root = createRoot(container);
    let currentModel: ExtensionManagementModel | undefined;

    await act(async () => {
      root.render(
        <StrictMode>
          <WorkbenchProvider
            availableExtensions={[...BUILTIN_WORKBENCH_EXTENSIONS, ...permissionedExtensions]}
            extensionsConfig={{ enabled: [], recommendations: [] }}
            installedExtensionsStorage={installedStorage}
            installedExtensionsStorageKey={installedStorageKey}
            onPersistenceDiagnostic={diagnostics}
            workspaceHostPort={authCapabilityHostPort}
          >
            <ExtensionManagementProbe
              catalogUrl="/extension-catalog.json"
              options={{
                installTrustStorage: trustStorage,
                installTrustStorageKey: trustStorageKey,
              }}
              onChange={(model) => {
                currentModel = model;
              }}
            />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    await waitForModel(() => currentModel?.catalogLoading === false);
    const jsonPreview = currentModel?.browseEntries.find(
      (entry) => entry.id === 'workbench-kit.samples.json-preview',
    );
    expect(jsonPreview).toBeDefined();
    const onInstall = vi.fn(currentModel!.installCatalogEntry);

    await act(async () => {
      const options = resolveExtensionInstallOptions(jsonPreview!, {
        confirm: () => true,
        rememberTrust: currentModel!.rememberInstallTrust,
      });
      expect(options).toEqual({ approved: true });
      onInstall(jsonPreview!, options);
    });

    await waitForModel(
      () =>
        currentModel?.installedEntries.find(
          (entry) => entry.id === 'workbench-kit.samples.json-preview',
        )?.enabled === true,
    );
    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(onInstall).toHaveBeenCalledWith(jsonPreview, { approved: true });
    expect(trustWriter).toHaveBeenCalledTimes(1);
    expect(installedWriter).toHaveBeenCalledTimes(1);
    expect(trustStorage.getItem(trustStorageKey)).toBeNull();
    expect(
      isExtensionInstallTrusted(
        jsonPreview!.id,
        jsonPreview!.installPlan?.permissions ?? [],
        currentModel!.installTrustRecords,
      ),
    ).toBe(true);
    expect(diagnostics).toHaveBeenCalledTimes(1);
    expect(diagnostics).toHaveBeenCalledWith({
      code: 'write_failed',
      message: 'Workbench storage value could not be written.',
      operation: 'write',
      storageKey: trustStorageKey,
    });
    expect(JSON.stringify(diagnostics.mock.calls)).not.toContain('BACKEND_SENSITIVE_DETAIL');
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });

  it('refuses absolute catalog URLs that are not allowlisted before fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const container = document.createElement('div');
    const root = createRoot(container);
    let currentModel: ExtensionManagementModel | undefined;

    await act(async () => {
      root.render(
        <StrictMode>
          <WorkbenchProvider workspaceHostPort={authCapabilityHostPort}>
            <ExtensionManagementProbe
              catalogUrl="https://cdn.example.com/extension-catalog.json"
              onChange={(model) => {
                currentModel = model;
              }}
            />
          </WorkbenchProvider>
        </StrictMode>,
      );
    });

    await waitForModel(() => currentModel?.catalogLoading === false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(currentModel?.catalogError).toMatch(/not allowlisted/i);

    await act(async () => {
      root.unmount();
    });
  });
});

async function waitForModel(predicate: () => boolean | undefined): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) {
      return;
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  throw new Error('Timed out waiting for extension management model state.');
}
