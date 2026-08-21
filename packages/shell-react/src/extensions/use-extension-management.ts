import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  DEFAULT_EXTENSION_CATALOG_TRUST_POLICY,
  DEFAULT_EXTENSION_INSTALL_TRUST_STORAGE_KEY,
  ExtensionInstallApprovalRequiredError,
  applyExtensionInstallPlanToRecords,
  assertExtensionCatalogUrlAllowed,
  loadExtensionInstallTrustRecords,
  parseExtensionCatalog,
  recordExtensionInstallTrust,
  saveExtensionInstallTrustRecordsResult,
  type ExtensionCatalogEntry,
  type ExtensionCatalogTrustPolicy,
  type ExtensionInstallTrustRecord,
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
import { useExtensionEnablementController } from './extension-enablement-context.js';
import type { ExtensionEnablementTransitionResult } from './extension-enablement-controller.js';
import { useWorkbenchPersistenceDiagnosticHandler } from '../shell/persistence-diagnostic-context.js';
import {
  reportPersistenceWriteResult,
  usePersistenceDiagnosticHandlerRef,
} from '../storage/persistence-diagnostics.js';

export interface UseExtensionManagementModelOptions {
  catalogTrustPolicy?: ExtensionCatalogTrustPolicy | undefined;
  catalogUrl?: string | undefined;
  installTrustStorage?: WorkbenchStorageAdapter | undefined;
  installTrustStorageKey?: string | undefined;
  onPersistenceDiagnostic?: WorkbenchPersistenceDiagnosticHandler | undefined;
}

export function useExtensionManagementModel({
  catalogTrustPolicy = DEFAULT_EXTENSION_CATALOG_TRUST_POLICY,
  catalogUrl = '/extension-catalog.json',
  installTrustStorage,
  installTrustStorageKey = DEFAULT_EXTENSION_INSTALL_TRUST_STORAGE_KEY,
  onPersistenceDiagnostic,
}: UseExtensionManagementModelOptions = {}) {
  const workbench = useWorkbench();
  const providerPersistenceDiagnostic = useWorkbenchPersistenceDiagnosticHandler();
  const diagnosticHandlerRef = usePersistenceDiagnosticHandlerRef(
    onPersistenceDiagnostic ?? providerPersistenceDiagnostic,
  );
  const extensionEnablement = useExtensionEnablementController();
  const { availableExtensions, extensionCatalog } = workbench;
  const resolvedInstallTrustStorage = installTrustStorage ?? workbench.installedExtensionsStorage;
  const installedRecords = useSyncExternalStore(
    extensionEnablement.subscribeInstalledRecords,
    extensionEnablement.getInstalledRecordsSnapshot,
    extensionEnablement.getInstalledRecordsSnapshot,
  );
  const [catalogEntries, setCatalogEntries] = useState<readonly ExtensionCatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(Boolean(catalogUrl));
  const [catalogError, setCatalogError] = useState<string | undefined>();
  const [pendingAction, setPendingAction] = useState<
    ExtensionManagementPendingAction | undefined
  >();
  const [lastTransition, setLastTransition] = useState<
    ExtensionEnablementTransitionResult | undefined
  >();
  const [installTrustRecords, setInstallTrustRecords] = useState<
    readonly ExtensionInstallTrustRecord[]
  >(() => loadExtensionInstallTrustRecords(installTrustStorageKey, resolvedInstallTrustStorage));

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
      transition: lastTransition,
      uninstallableExtensionIds: new Set(installedRecords.map((record) => record.id)),
    });
  }, [availableExtensions, extensionCatalog, installedRecords, lastTransition]);

  const handleTransition = useCallback(
    (
      result: ExtensionEnablementTransitionResult,
      pendingKind: ExtensionManagementPendingAction['kind'],
    ) => {
      setLastTransition(result);
      if (result.kind !== 'reloadRequired') {
        setPendingAction(undefined);
        return;
      }

      setPendingAction({ entryId: result.extensionId, kind: pendingKind });
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          window.location.reload();
        });
      }
    },
    [],
  );

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
      handleTransition(extensionEnablement.commitInstalledRecords(next, entry.id), 'install');
    },
    [
      availableExtensions,
      catalogEntries,
      extensionCatalog,
      installedRecords,
      extensionEnablement,
      handleTransition,
    ],
  );

  const toggleInstalledEntry = useCallback(
    (entry: ExtensionManagementEntry, enabled: boolean) => {
      if (entry.source === 'bundled' && entry.id.startsWith('workbench-kit.builtin.')) {
        return;
      }

      handleTransition(extensionEnablement.toggleInstalledExtension(entry.id, enabled), 'toggle');
    },
    [extensionEnablement, handleTransition],
  );

  const uninstallInstalledEntry = useCallback(
    (entry: ExtensionManagementEntry) => {
      if (entry.source !== 'installed' || entry.id.startsWith('workbench-kit.builtin.')) {
        return;
      }

      const result = extensionEnablement.uninstallInstalledExtension(entry.id);
      if (!result) {
        setPendingAction(undefined);
        return;
      }
      handleTransition(result, 'uninstall');
    },
    [extensionEnablement, handleTransition],
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
    uninstallInstalledEntry,
  };
}
