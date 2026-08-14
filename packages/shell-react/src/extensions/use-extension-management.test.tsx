/** @vitest-environment jsdom */

import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkbenchStorageAdapter } from '@workbench-kit/workbench-core';

import { WorkbenchProvider } from '../shell/provider.js';
import { useExtensionManagementModel } from './use-extension-management.js';
import { BUILTIN_WORKBENCH_EXTENSIONS } from './builtin-extensions.js';
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
}: {
  catalogUrl?: string | undefined;
  onChange: (model: ExtensionManagementModel) => void;
}) {
  const model = useExtensionManagementModel({ catalogUrl });

  useEffect(() => {
    onChange(model);
  }, [model, onChange]);

  return null;
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

  it('keeps failed install state in memory and reloads only after a later committed snapshot', async () => {
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

    await waitForModel(
      () =>
        currentModel?.installedEntries.find(
          (entry) => entry.id === 'workbench-kit.samples.json-preview',
        )?.enabled === true,
    );
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

    const installedEntry = currentModel?.installedEntries.find(
      (entry) => entry.id === 'workbench-kit.samples.json-preview',
    );
    expect(installedEntry).toBeDefined();
    await act(async () => {
      currentModel?.toggleInstalledEntry(installedEntry!, false);
    });

    expect(
      currentModel?.installedEntries.find(
        (entry) => entry.id === 'workbench-kit.samples.json-preview',
      )?.enabled,
    ).toBe(false);
    expect(currentModel?.pendingAction).toBeUndefined();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(diagnostics).toHaveBeenCalledTimes(2);
    expect(diagnostics).toHaveBeenLastCalledWith({
      code: 'write_failed',
      message: 'Workbench storage value could not be written.',
      operation: 'write',
      storageKey,
    });

    failWrites = false;
    const recoveredEntry = currentModel?.installedEntries.find(
      (entry) => entry.id === 'workbench-kit.samples.json-preview',
    );
    expect(recoveredEntry).toBeDefined();
    await act(async () => {
      currentModel?.toggleInstalledEntry(recoveredEntry!, true);
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
