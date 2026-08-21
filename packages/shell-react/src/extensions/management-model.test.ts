import { describe, expect, it } from 'vitest';
import {
  ExtensionRegistry,
  type ExtensionCatalogEntry,
  type WorkbenchExtensionDescription,
} from '@workbench-kit/workbench-core';

import {
  createExtensionCatalogBrowseEntries,
  createExtensionManagementEntries,
} from './management-model.js';
import { BUILTIN_WORKBENCH_EXTENSIONS } from './builtin-extensions.js';
import { SAMPLE_WORKBENCH_EXTENSIONS } from '../../../../examples/workbench-sample/src/sample-extensions.js';

const AVAILABLE_EXTENSIONS = [
  ...BUILTIN_WORKBENCH_EXTENSIONS,
  ...SAMPLE_WORKBENCH_EXTENSIONS,
] as const;

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
      availableExtensions: AVAILABLE_EXTENSIONS,
      catalogEntries: [helloWorldCatalogEntry],
      extensionCatalog: createCatalogReader(registry),
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
      availableExtensions: AVAILABLE_EXTENSIONS,
      extensionCatalog: createCatalogReader(registry),
      installedRecords: [
        {
          category: 'theme',
          enabled: true,
          id: 'workbench-kit.samples.theme-alt',
          installedAt: '2026-06-21T00:00:00.000Z',
          manifestUrl: 'workbench-kit.samples.theme-alt',
        },
      ],
      transition: {
        extensionId: 'workbench-kit.samples.theme-alt',
        kind: 'applied',
        message: 'Applied without reloading the workbench.',
      },
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'workbench-kit.builtin.explorer',
          source: 'bundled',
        }),
        expect.objectContaining({
          canUninstall: true,
          enabled: true,
          id: 'workbench-kit.samples.theme-alt',
          source: 'installed',
          transition: {
            kind: 'applied',
            message: 'Applied without reloading the workbench.',
          },
        }),
      ]),
    );

    registry.dispose();
  });

  it('derives uninstall eligibility only from persisted installed records', () => {
    const registry = new ExtensionRegistry();
    const activeOnlyExtension = createActiveOnlyExtension();
    registry.registerExtension(activeOnlyExtension);

    const withoutRecord = createExtensionManagementEntries({
      availableExtensions: AVAILABLE_EXTENSIONS,
      extensionCatalog: createCatalogReader(registry),
      installedRecords: [],
    });
    const activeOnlyWithoutRecord = withoutRecord.find(
      (entry) => entry.id === activeOnlyExtension.manifest.id,
    );

    expect(activeOnlyWithoutRecord).toMatchObject({
      id: activeOnlyExtension.manifest.id,
      source: 'installed',
    });
    expect(activeOnlyWithoutRecord).not.toHaveProperty('canUninstall');
    expect(
      withoutRecord.find((entry) => entry.id === 'workbench-kit.builtin.explorer'),
    ).not.toHaveProperty('canUninstall');

    const withRecord = createExtensionManagementEntries({
      availableExtensions: AVAILABLE_EXTENSIONS,
      extensionCatalog: createCatalogReader(registry),
      installedRecords: [
        {
          category: 'utility',
          enabled: true,
          id: activeOnlyExtension.manifest.id,
          installedAt: '2026-08-22T00:00:00.000Z',
          manifestUrl: activeOnlyExtension.manifest.id,
        },
      ],
    });

    expect(withRecord.find((entry) => entry.id === activeOnlyExtension.manifest.id)).toMatchObject({
      canUninstall: true,
      source: 'installed',
    });

    registry.dispose();
  });

  it.each([true, false])(
    'blocks uninstall for a persisted hard dependent when enabled=%s',
    (enabled) => {
      const registry = new ExtensionRegistry();
      const target = createActiveOnlyExtension();
      const dependent: WorkbenchExtensionDescription = {
        manifest: {
          ...target.manifest,
          displayName: 'Dependent Extension',
          extensionDependencies: [target.manifest.id],
          id: 'workbench-kit.test.dependent',
          name: 'dependent',
        },
      };
      const records = [
        installedRecord(target.manifest.id, true),
        installedRecord(dependent.manifest.id, enabled),
      ];

      const entries = createExtensionManagementEntries({
        availableExtensions: [target, dependent],
        extensionCatalog: createCatalogReader(registry),
        installedRecords: records,
      });
      const targetEntry = entries.find((entry) => entry.id === target.manifest.id);

      expect(targetEntry).not.toHaveProperty('canUninstall');
      expect(targetEntry?.diagnostics).toContainEqual({
        message:
          'Cannot uninstall because these installed extensions depend on it: workbench-kit.test.dependent.',
        severity: 'error',
      });
      expect(entries.find((entry) => entry.id === dependent.manifest.id)).toMatchObject({
        canUninstall: true,
      });

      registry.dispose();
    },
  );

  it('fails closed with visible diagnostics for unresolved remaining manifests', () => {
    const registry = new ExtensionRegistry();
    const target = createActiveOnlyExtension();
    const entries = createExtensionManagementEntries({
      availableExtensions: [target],
      extensionCatalog: createCatalogReader(registry),
      installedRecords: [
        installedRecord(target.manifest.id, true),
        installedRecord('workbench-kit.test.unresolved', false),
      ],
    });
    const targetEntry = entries.find((entry) => entry.id === target.manifest.id);

    expect(targetEntry).not.toHaveProperty('canUninstall');
    expect(targetEntry?.diagnostics).toContainEqual({
      message:
        'Cannot verify uninstall safety because these extension manifests are unavailable or ambiguous: workbench-kit.test.unresolved.',
      severity: 'error',
    });

    registry.dispose();
  });
});

function installedRecord(id: string, enabled: boolean) {
  return {
    category: 'utility',
    enabled,
    id,
    installedAt: '2026-08-22T00:00:00.000Z',
    manifestUrl: id,
  };
}

function createActiveOnlyExtension(): WorkbenchExtensionDescription {
  return {
    manifest: {
      activationEvents: ['onStartup'],
      displayName: 'Active Only Extension',
      engines: {
        extensionApi: '^0.0.0',
        workbench: '^0.0.0',
      },
      id: 'workbench-kit.test.active-only',
      name: 'active-only',
      publisher: 'workbench-kit',
      schemaVersion: 1,
      version: '0.0.0',
    },
  };
}

function createCatalogReader(registry: ExtensionRegistry) {
  return {
    getDependencyDiagnostics: () => registry.getDependencyDiagnostics(),
    getExtension: (id: string) => registry.getExtension(id),
    getExtensions: () => registry.getExtensions(),
    getFeatureInspections: () => registry.getFeatureInspections(),
    getFeatureSpecs: () => registry.getFeatureSpecs(),
    listCapabilityProviderIds: () => registry.capabilityRegistry.listProviderIds(),
  };
}
