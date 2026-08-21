import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_EXTENSION_CATALOG_TRUST_POLICY,
  DEFAULT_EXTENSION_INSTALL_TRUST_STORAGE_KEY,
  DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  ExtensionInstallApprovalRequiredError,
  applyExtensionInstallPlanToRecords,
  assertExtensionCatalogUrlAllowed,
  loadExtensionInstallTrustRecords,
  loadInstalledExtensionsResult,
  parseExtensionCatalog,
  recordExtensionInstallTrust,
  saveExtensionInstallTrustRecordsResult,
  saveInstalledExtensionsResult,
  type ExtensionCatalogEntry,
  type ExtensionCatalogTrustPolicy,
  type ExtensionInstallTrustRecord,
  type InstalledExtensionRecord,
  type WorkbenchPersistenceDiagnosticHandler,
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
import { useWorkbenchPersistenceDiagnosticHandler } from '../shell/persistence-diagnostic-context.js';
import {
  reportPersistenceWriteResult,
  usePersistenceDiagnosticHandlerRef,
  useReportPersistenceReadDiagnostic,
} from '../storage/persistence-diagnostics.js';

export interface UseExtensionManagementModelOptions {
  catalogTrustPolicy?: ExtensionCatalogTrustPolicy | undefined;
  catalogUrl?: string | undefined;
  installedExtensionsStorage?: WorkbenchStorageAdapter | undefined;
  installedExtensionsStorageKey?: string | undefined;
  installTrustStorage?: WorkbenchStorageAdapter | undefined;
  installTrustStorageKey?: string | undefined;
  onPersistenceDiagnostic?: WorkbenchPersistenceDiagnosticHandler | undefined;
}

export function useExtensionManagementModel({
  catalogTrustPolicy = DEFAULT_EXTENSION_CATALOG_TRUST_POLICY,
  catalogUrl = '/extension-catalog.json',
  installedExtensionsStorage,
  installedExtensionsStorageKey,
  installTrustStorage,
  installTrustStorageKey = DEFAULT_EXTENSION_INSTALL_TRUST_STORAGE_KEY,
  onPersistenceDiagnostic,
}: UseExtensionManagementModelOptions = {}) {
  const workbench = useWorkbench();
  const providerPersistenceDiagnostic = useWorkbenchPersistenceDiagnosticHandler();
  const diagnosticHandlerRef = usePersistenceDiagnosticHandlerRef(
    onPersistenceDiagnostic ?? providerPersistenceDiagnostic,
  );
  const { availableExtensions, extensionCatalog } = workbench;
  const resolvedInstalledExtensionsStorage =
    installedExtensionsStorage ?? workbench.installedExtensionsStorage;
  const resolvedInstalledExtensionsStorageKey =
    installedExtensionsStorageKey ??
    workbench.installedExtensionsStorageKey ??
    DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY;
  const resolvedInstallTrustStorage = installTrustStorage ?? resolvedInstalledExtensionsStorage;
  const installedExtensionsReadResult = useMemo(
    () =>
      loadInstalledExtensionsResult(
        resolvedInstalledExtensionsStorageKey,
        resolvedInstalledExtensionsStorage,
      ),
    [resolvedInstalledExtensionsStorage, resolvedInstalledExtensionsStorageKey],
  );
  const initiallyLoadedInstalledRecords = installedExtensionsReadResult.value;
  const [catalogEntries, setCatalogEntries] = useState<readonly ExtensionCatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(Boolean(catalogUrl));
  const [catalogError, setCatalogError] = useState<string | undefined>();
  const [pendingAction, setPendingAction] = useState<
    ExtensionManagementPendingAction | undefined
  >();
  const [installedRecords, setInstalledRecords] = useState<readonly InstalledExtensionRecord[]>(
    initiallyLoadedInstalledRecords,
  );
  const [installTrustRecords, setInstallTrustRecords] = useState<
    readonly ExtensionInstallTrustRecord[]
  >(() => loadExtensionInstallTrustRecords(installTrustStorageKey, resolvedInstallTrustStorage));

  useReportPersistenceReadDiagnostic(
    installedExtensionsReadResult.diagnostic,
    [resolvedInstalledExtensionsStorage, resolvedInstalledExtensionsStorageKey],
    diagnosticHandlerRef,
  );

  useEffect(() => {
    setInstalledRecords(initiallyLoadedInstalledRecords);
  }, [initiallyLoadedInstalledRecords]);

  useEffect(() => {
    setInstallTrustRecords(
      loadExtensionInstallTrustRecords(installTrustStorageKey, resolvedInstallTrustStorage),
    );
  }, [installTrustStorageKey, resolvedInstallTrustStorage]);

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
    return createExtensionManagementEntries({
      availableExtensions,
      extensionCatalog,
      installedRecords,
    });
  }, [availableExtensions, extensionCatalog, installedRecords]);

  const browseEntries = useMemo<readonly ExtensionCatalogBrowseEntry[]>(() => {
    return createExtensionCatalogBrowseEntries({
      availableExtensions,
      catalogEntries,
      extensionCatalog,
      installedRecords,
    });
  }, [availableExtensions, catalogEntries, extensionCatalog, installedRecords]);

  const installCatalogEntry = useCallback(
    (entry: ExtensionCatalogBrowseEntry, options?: ExtensionInstallOptions) => {
      const installContext = createExtensionInstallPlanningContext({
        availableExtensions,
        catalogEntries,
        extensionCatalog,
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
      const persistence = saveInstalledExtensionsResult(
        next,
        resolvedInstalledExtensionsStorageKey,
        resolvedInstalledExtensionsStorage,
      );
      setInstalledRecords(next);
      reportPersistenceWriteResult(persistence, diagnosticHandlerRef);
      setPendingAction(persistence.committed ? { entryId: entry.id, kind: 'install' } : undefined);
      if (persistence.committed && typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          window.location.reload();
        });
      }
    },
    [
      availableExtensions,
      catalogEntries,
      extensionCatalog,
      installedRecords,
      diagnosticHandlerRef,
      resolvedInstalledExtensionsStorage,
      resolvedInstalledExtensionsStorageKey,
    ],
  );

  const toggleInstalledEntry = useCallback(
    (entry: ExtensionManagementEntry, enabled: boolean) => {
      if (entry.source === 'bundled' && entry.id.startsWith('workbench-kit.builtin.')) {
        return;
      }

      const next = setInstalledExtensionEnabled(installedRecords, entry.id, enabled);
      const persistence = saveInstalledExtensionsResult(
        next,
        resolvedInstalledExtensionsStorageKey,
        resolvedInstalledExtensionsStorage,
      );
      setInstalledRecords(next);
      reportPersistenceWriteResult(persistence, diagnosticHandlerRef);
      setPendingAction(persistence.committed ? { entryId: entry.id, kind: 'toggle' } : undefined);
      if (persistence.committed && typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          window.location.reload();
        });
      }
    },
    [
      diagnosticHandlerRef,
      installedRecords,
      resolvedInstalledExtensionsStorage,
      resolvedInstalledExtensionsStorageKey,
    ],
  );

  const rememberInstallTrust = useCallback(
    (entry: ExtensionCatalogBrowseEntry) => {
      const permissions = entry.installPlan?.permissions ?? [];
      const next = recordExtensionInstallTrust(entry.id, permissions, installTrustRecords);
      setInstallTrustRecords(next);
      const persistence = saveExtensionInstallTrustRecordsResult(
        next,
        installTrustStorageKey,
        resolvedInstallTrustStorage,
      );
      reportPersistenceWriteResult(persistence, diagnosticHandlerRef);
    },
    [
      diagnosticHandlerRef,
      installTrustRecords,
      installTrustStorageKey,
      resolvedInstallTrustStorage,
    ],
  );

  return {
    browseEntries,
    catalogError,
    catalogLoading,
    installCatalogEntry,
    installedEntries,
    installTrustRecords,
    pendingAction,
    rememberInstallTrust,
    toggleInstalledEntry,
  };
}

function setInstalledExtensionEnabled(
  current: readonly InstalledExtensionRecord[],
  extensionId: string,
  enabled: boolean,
): InstalledExtensionRecord[] {
  const index = current.findIndex((entry) => entry.id === extensionId);
  if (index < 0) {
    return [...current];
  }

  const target = current[index];
  if (!target) {
    return [...current];
  }

  const next = [...current];
  next[index] = { ...target, enabled };
  return next;
}
