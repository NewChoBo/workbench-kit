/** @vitest-environment jsdom */

import { act, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkbenchStorageAdapter } from '@workbench-kit/workbench-core';

import { WorkbenchProvider } from './provider.js';
import { useExtensionManagementModel } from './use-extension-management.js';

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

    await act(async () => {
      currentModel?.installCatalogEntry(jsonPreview!);
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
