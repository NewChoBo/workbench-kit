import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BUILTIN_WORKBENCH_EXTENSIONS,
  DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  SAMPLE_WORKBENCH_EXTENSIONS,
  createExtensionFeatureSpec,
  installExtensionRecord,
  loadInstalledExtensions,
  parseExtensionCatalog,
  toggleInstalledExtensionEnabled,
  type ExtensionFeatureInspection,
  type ExtensionFeatureSpec,
  type ExtensionRegistry,
  type ExtensionCatalogEntry,
  type InstalledExtensionRecord,
} from '@workbench-kit/workbench-core';
import type {
  ExtensionCatalogBrowseEntry,
  ExtensionManagementDiagnosticSummary,
  ExtensionManagementEntry,
  ExtensionManagementFeatureSummary,
} from '@workbench-kit/react/workbench/management';

import { useWorkbench, type WorkbenchStorageAdapter } from './provider.js';

const BUNDLED_EXTENSIONS = [...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS];

export interface UseExtensionManagementModelOptions {
  catalogUrl?: string | undefined;
  installedExtensionsStorage?: WorkbenchStorageAdapter | undefined;
  installedExtensionsStorageKey?: string | undefined;
}

export function useExtensionManagementModel({
  catalogUrl = '/extension-catalog.json',
  installedExtensionsStorage,
  installedExtensionsStorageKey,
}: UseExtensionManagementModelOptions = {}) {
  const workbench = useWorkbench();
  const { extensionRegistry } = workbench;
  const resolvedInstalledExtensionsStorage =
    installedExtensionsStorage ?? workbench.installedExtensionsStorage;
  const resolvedInstalledExtensionsStorageKey =
    installedExtensionsStorageKey ??
    workbench.installedExtensionsStorageKey ??
    DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY;
  const [catalogEntries, setCatalogEntries] = useState<readonly ExtensionCatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(Boolean(catalogUrl));
  const [catalogError, setCatalogError] = useState<string | undefined>();
  const [installedRecords, setInstalledRecords] = useState<readonly InstalledExtensionRecord[]>(
    () =>
      loadInstalledExtensions(
        resolvedInstalledExtensionsStorageKey,
        resolvedInstalledExtensionsStorage,
      ),
  );

  useEffect(() => {
    setInstalledRecords(
      loadInstalledExtensions(
        resolvedInstalledExtensionsStorageKey,
        resolvedInstalledExtensionsStorage,
      ),
    );
  }, [resolvedInstalledExtensionsStorage, resolvedInstalledExtensionsStorageKey]);

  useEffect(() => {
    if (!catalogUrl) {
      setCatalogEntries([]);
      setCatalogLoading(false);
      setCatalogError(undefined);
      return;
    }

    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(undefined);

    void fetch(catalogUrl)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Catalog request failed with status ${response.status}.`);
        }

        const catalog = parseExtensionCatalog(await response.json());
        if (!cancelled) {
          setCatalogEntries(catalog.entries);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCatalogEntries([]);
          setCatalogError(
            error instanceof Error ? error.message : 'Failed to load extension catalog.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [catalogUrl]);

  const installedEntries = useMemo<readonly ExtensionManagementEntry[]>(() => {
    const installedById = new Map(installedRecords.map((record) => [record.id, record]));
    const extensionFeatures = createExtensionManagementFeatureMaps(extensionRegistry);
    const bundledEntries = BUNDLED_EXTENSIONS.map((extension) => {
      const installed = installedById.get(extension.manifest.id);
      const isBuiltin = extension.manifest.id.startsWith('workbench-kit.builtin.');
      const featureState = resolveExtensionManagementFeatureState(
        extension.manifest.id,
        extensionFeatures,
      );

      return {
        category: installed?.category ?? (isBuiltin ? 'builtin' : 'sample'),
        description: extension.manifest.displayName,
        diagnostics: featureState.diagnostics,
        displayName: extension.manifest.displayName,
        enabled: isBuiltin ? true : (installed?.enabled ?? false),
        features: featureState.features,
        id: extension.manifest.id,
        installedAt: installed?.installedAt,
        manifestUrl: installed?.manifestUrl,
        source: isBuiltin ? ('bundled' as const) : ('installed' as const),
      } satisfies ExtensionManagementEntry;
    }).filter((entry) => entry.source === 'bundled' || installedById.has(entry.id));

    const activeExtensions = extensionRegistry
      .getExtensions()
      .filter(
        (extension) =>
          !BUNDLED_EXTENSIONS.some((bundled) => bundled.manifest.id === extension.manifest.id),
      )
      .map((extension) => {
        const installed = installedById.get(extension.manifest.id);
        const featureState = resolveExtensionManagementFeatureState(
          extension.manifest.id,
          extensionFeatures,
        );

        return {
          category: installed?.category ?? 'installed',
          description: extension.manifest.displayName,
          diagnostics: featureState.diagnostics,
          displayName: extension.manifest.displayName,
          enabled: installed?.enabled ?? true,
          features: featureState.features,
          id: extension.manifest.id,
          installedAt: installed?.installedAt,
          manifestUrl: installed?.manifestUrl,
          source: 'installed',
        } satisfies ExtensionManagementEntry;
      });

    return [...bundledEntries, ...activeExtensions].sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    );
  }, [extensionRegistry, installedRecords]);

  const browseEntries = useMemo<readonly ExtensionCatalogBrowseEntry[]>(() => {
    const installedIds = new Set(installedRecords.map((record) => record.id));

    return catalogEntries.map((entry) => ({
      category: entry.category,
      description: entry.description,
      displayName: entry.displayName,
      icon: entry.icon,
      id: entry.id,
      installed: installedIds.has(entry.id),
      manifestUrl: entry.manifestUrl,
    }));
  }, [catalogEntries, installedRecords]);

  const installCatalogEntry = useCallback(
    (entry: ExtensionCatalogBrowseEntry) => {
      const next = installExtensionRecord(
        {
          category: entry.category,
          enabled: true,
          id: entry.id,
          manifestUrl: entry.manifestUrl,
        },
        resolvedInstalledExtensionsStorageKey,
        resolvedInstalledExtensionsStorage,
      );
      setInstalledRecords(next);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    [resolvedInstalledExtensionsStorage, resolvedInstalledExtensionsStorageKey],
  );

  const toggleInstalledEntry = useCallback(
    (entry: ExtensionManagementEntry, enabled: boolean) => {
      if (entry.source === 'bundled' && entry.id.startsWith('workbench-kit.builtin.')) {
        return;
      }

      const next = toggleInstalledExtensionEnabled(
        entry.id,
        enabled,
        resolvedInstalledExtensionsStorageKey,
        resolvedInstalledExtensionsStorage,
      );
      setInstalledRecords(next);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    [resolvedInstalledExtensionsStorage, resolvedInstalledExtensionsStorageKey],
  );

  return {
    browseEntries,
    catalogError,
    catalogLoading,
    installCatalogEntry,
    installedEntries,
    toggleInstalledEntry,
  };
}

function createExtensionManagementFeatureMaps(extensionRegistry: ExtensionRegistry) {
  return {
    bundledFeaturesById: new Map(
      BUNDLED_EXTENSIONS.map((extension) => [
        extension.manifest.id,
        createExtensionFeatureSpec(extension),
      ]),
    ),
    inspectionsById: new Map(
      extensionRegistry
        .getFeatureInspections()
        .map((inspection) => [inspection.feature.id, inspection]),
    ),
  };
}

function resolveExtensionManagementFeatureState(
  extensionId: string,
  {
    bundledFeaturesById,
    inspectionsById,
  }: {
    bundledFeaturesById: ReadonlyMap<string, ExtensionFeatureSpec>;
    inspectionsById: ReadonlyMap<string, ExtensionFeatureInspection>;
  },
): {
  readonly diagnostics?: readonly ExtensionManagementDiagnosticSummary[] | undefined;
  readonly features?: ExtensionManagementFeatureSummary | undefined;
} {
  const inspection = inspectionsById.get(extensionId);
  const feature = inspection?.feature ?? bundledFeaturesById.get(extensionId);

  return {
    diagnostics: inspection?.diagnostics.map(({ message, severity }) => ({ message, severity })),
    features: feature ? toExtensionManagementFeatureSummary(feature) : undefined,
  };
}

function toExtensionManagementFeatureSummary(
  feature: ExtensionFeatureSpec,
): ExtensionManagementFeatureSummary {
  const commandTitlesById = new Map(feature.commands.map((command) => [command.id, command.title]));

  return {
    capabilities: feature.capabilities,
    commands: feature.commands.map((command) => ({
      description: command.description,
      id: command.id,
      label: command.title,
    })),
    documentViews: feature.documentViews.map((view) => ({
      id: view.id,
      label: view.label,
    })),
    menus: feature.menus.map((menu) => ({
      description: formatMenuContributionDescription(menu.group, menu.order),
      id: `${menu.menu}:${menu.command}`,
      label: `${menu.menu}: ${commandTitlesById.get(menu.command) ?? menu.command}`,
    })),
    permissions: feature.permissions,
    settings: feature.settings.map((setting) => ({
      description: setting.description,
      id: setting.key,
      label: setting.key,
    })),
    views: feature.views.map((view) => ({
      id: view.id,
      label: view.name,
    })),
  };
}

function formatMenuContributionDescription(
  group: string | undefined,
  order: number | undefined,
): string | undefined {
  const parts = [
    group ? `group: ${group}` : undefined,
    order !== undefined ? `order: ${order}` : undefined,
  ].filter((part): part is string => part !== undefined);

  return parts.length > 0 ? parts.join(', ') : undefined;
}
