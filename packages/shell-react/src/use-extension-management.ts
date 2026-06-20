import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BUILTIN_WORKBENCH_EXTENSIONS,
  DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  SAMPLE_WORKBENCH_EXTENSIONS,
  installExtensionRecord,
  loadInstalledExtensions,
  parseExtensionCatalog,
  toggleInstalledExtensionEnabled,
  type ExtensionCatalogEntry,
  type InstalledExtensionRecord,
} from '@workbench-kit/workbench-core';
import type {
  ExtensionCatalogBrowseEntry,
  ExtensionManagementEntry,
} from '@workbench-kit/react/workbench/management';

import { useWorkbench } from './provider.js';

const BUNDLED_EXTENSIONS = [...BUILTIN_WORKBENCH_EXTENSIONS, ...SAMPLE_WORKBENCH_EXTENSIONS];

export interface UseExtensionManagementModelOptions {
  catalogUrl?: string | undefined;
  installedExtensionsStorageKey?: string | undefined;
}

export function useExtensionManagementModel({
  catalogUrl = '/extension-catalog.json',
  installedExtensionsStorageKey = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
}: UseExtensionManagementModelOptions = {}) {
  const { extensionRegistry } = useWorkbench();
  const [catalogEntries, setCatalogEntries] = useState<readonly ExtensionCatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(Boolean(catalogUrl));
  const [catalogError, setCatalogError] = useState<string | undefined>();
  const [installedRecords, setInstalledRecords] = useState<readonly InstalledExtensionRecord[]>(
    () => loadInstalledExtensions(installedExtensionsStorageKey),
  );

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
    const bundledEntries = BUNDLED_EXTENSIONS.map((extension) => {
      const installed = installedById.get(extension.manifest.id);
      const isBuiltin = extension.manifest.id.startsWith('workbench-kit.builtin.');

      return {
        category: installed?.category ?? (isBuiltin ? 'builtin' : 'sample'),
        description: extension.manifest.displayName,
        displayName: extension.manifest.displayName,
        enabled: isBuiltin ? true : (installed?.enabled ?? false),
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
      .map(
        (extension) =>
          ({
            category: installedById.get(extension.manifest.id)?.category ?? 'installed',
            description: extension.manifest.displayName,
            displayName: extension.manifest.displayName,
            enabled: installedById.get(extension.manifest.id)?.enabled ?? true,
            id: extension.manifest.id,
            installedAt: installedById.get(extension.manifest.id)?.installedAt,
            manifestUrl: installedById.get(extension.manifest.id)?.manifestUrl,
            source: 'installed',
          }) satisfies ExtensionManagementEntry,
      );

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
        installedExtensionsStorageKey,
      );
      setInstalledRecords(next);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    [installedExtensionsStorageKey],
  );

  const toggleInstalledEntry = useCallback(
    (entry: ExtensionManagementEntry, enabled: boolean) => {
      if (entry.source === 'bundled' && entry.id.startsWith('workbench-kit.builtin.')) {
        return;
      }

      const next = toggleInstalledExtensionEnabled(
        entry.id,
        enabled,
        installedExtensionsStorageKey,
      );
      setInstalledRecords(next);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    [installedExtensionsStorageKey],
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
