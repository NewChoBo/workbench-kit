import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_EXTENSION_CATALOG_TRUST_POLICY,
  DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  ExtensionInstallApprovalRequiredError,
  applyExtensionInstallPlanToRecords,
  assertExtensionCatalogUrlAllowed,
  loadInstalledExtensions,
  parseExtensionCatalog,
  saveInstalledExtensions,
  toggleInstalledExtensionEnabled,
  type ExtensionCatalogEntry,
  type ExtensionCatalogTrustPolicy,
  type InstalledExtensionRecord,
} from '@workbench-kit/workbench-core';
import type {
  ExtensionCatalogBrowseEntry,
  ExtensionInstallOptions,
  ExtensionManagementEntry,
  ExtensionManagementPendingAction,
} from '@workbench-kit/react/workbench/management';

import {
  createCatalogEntryInstallPlan,
  createExtensionCatalogBrowseEntries,
  createExtensionInstallPlanningContext,
  createExtensionManagementEntries,
} from './management-model.js';
import { useWorkbench, type WorkbenchStorageAdapter } from '../shell/provider.js';

export interface UseExtensionManagementModelOptions {
  catalogTrustPolicy?: ExtensionCatalogTrustPolicy | undefined;
  catalogUrl?: string | undefined;
  installedExtensionsStorage?: WorkbenchStorageAdapter | undefined;
  installedExtensionsStorageKey?: string | undefined;
}

export function useExtensionManagementModel({
  catalogTrustPolicy = DEFAULT_EXTENSION_CATALOG_TRUST_POLICY,
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
  const [pendingAction, setPendingAction] = useState<
    ExtensionManagementPendingAction | undefined
  >();
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

    void Promise.resolve()
      .then(() => {
        assertExtensionCatalogUrlAllowed(catalogUrl, catalogTrustPolicy);
        return fetch(catalogUrl);
      })
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
  }, [catalogTrustPolicy, catalogUrl]);

  const installedEntries = useMemo<readonly ExtensionManagementEntry[]>(() => {
    return createExtensionManagementEntries({ extensionRegistry, installedRecords });
  }, [extensionRegistry, installedRecords]);

  const browseEntries = useMemo<readonly ExtensionCatalogBrowseEntry[]>(() => {
    return createExtensionCatalogBrowseEntries({
      catalogEntries,
      extensionRegistry,
      installedRecords,
    });
  }, [catalogEntries, extensionRegistry, installedRecords]);

  const installCatalogEntry = useCallback(
    (entry: ExtensionCatalogBrowseEntry, options?: ExtensionInstallOptions) => {
      const installContext = createExtensionInstallPlanningContext({
        catalogEntries,
        extensionRegistry,
        installedRecords,
      });
      const plan = createCatalogEntryInstallPlan(entry, installContext);
      if (!plan || plan.blocked) {
        return;
      }

      // Align with core hard gate: unapproved privileged installs must not persist.
      if (plan.requiresApproval && options?.approved !== true) {
        throw new ExtensionInstallApprovalRequiredError();
      }

      const next = applyExtensionInstallPlanToRecords({
        approved: options?.approved === true,
        currentRecords: installedRecords,
        installSources: installContext.installSources,
        plan,
      });
      saveInstalledExtensions(
        next,
        resolvedInstalledExtensionsStorageKey,
        resolvedInstalledExtensionsStorage,
      );
      setInstalledRecords(next);
      setPendingAction({ entryId: entry.id, kind: 'install' });
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          window.location.reload();
        });
      }
    },
    [
      catalogEntries,
      extensionRegistry,
      installedRecords,
      resolvedInstalledExtensionsStorage,
      resolvedInstalledExtensionsStorageKey,
    ],
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
      setPendingAction({ entryId: entry.id, kind: 'toggle' });
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          window.location.reload();
        });
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
    pendingAction,
    toggleInstalledEntry,
  };
}
