import { describe, expect, it } from 'vitest';
import { ExtensionRegistry, type ExtensionCatalogEntry } from '@workbench-kit/workbench-core';

import {
  createExtensionCatalogBrowseEntries,
  createExtensionManagementEntries,
} from './extension-management-model.js';

const helloWorldCatalogEntry: ExtensionCatalogEntry = {
  category: 'utility',
  description: 'Minimal command activation sample.',
  displayName: 'Hello World Sample',
  id: 'workbench-kit.samples.hello-world',
  manifestUrl: 'workbench-kit.samples.hello-world',
};

describe('extension-management-model', () => {
  it('creates catalog browse entries with install plan summaries', () => {
    const registry = new ExtensionRegistry();

    const entries = createExtensionCatalogBrowseEntries({
      catalogEntries: [helloWorldCatalogEntry],
      extensionRegistry: registry,
      installedRecords: [],
    });

    expect(entries).toEqual([
      expect.objectContaining({
        id: 'workbench-kit.samples.hello-world',
        installed: false,
        installPlan: expect.objectContaining({
          blocked: false,
          installExtensionIds: ['workbench-kit.samples.hello-world'],
          requiresApproval: false,
        }),
      }),
    ]);

    registry.dispose();
  });

  it('creates installed management entries from bundled records', () => {
    const registry = new ExtensionRegistry();

    const entries = createExtensionManagementEntries({
      extensionRegistry: registry,
      installedRecords: [
        {
          category: 'theme',
          enabled: true,
          id: 'workbench-kit.samples.theme-alt',
          installedAt: '2026-06-21T00:00:00.000Z',
          manifestUrl: 'workbench-kit.samples.theme-alt',
        },
      ],
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'workbench-kit.builtin.explorer',
          source: 'bundled',
        }),
        expect.objectContaining({
          enabled: true,
          id: 'workbench-kit.samples.theme-alt',
          source: 'installed',
        }),
      ]),
    );

    registry.dispose();
  });
});
