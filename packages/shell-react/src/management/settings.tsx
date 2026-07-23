import { useCallback } from 'react';
import {
  AccountManagementPanel,
  CommandManagementPanel,
  ExtensionManagementPanel,
  type AccountManagementEntry,
} from '@workbench-kit/react/workbench/management';
import {
  isExtensionInstallTrusted,
  type ExtensionCatalogTrustPolicy,
} from '@workbench-kit/workbench-core';

import { useCommandManagementModel } from './use-command-management.js';
import { useExtensionManagementModel } from '../extensions/use-extension-management.js';
import { WorkbenchKeybindingManagementSettings } from './keybinding-settings.js';

export { WorkbenchKeybindingManagementSettings };

export interface WorkbenchAccountManagementInput {
  accounts: readonly AccountManagementEntry[];
  activeAccountId?: string | undefined;
  automationHint?: string | undefined;
  emptyLabel?: string | undefined;
  onSignOut?: ((accountId: string) => void) | undefined;
  sessionLabel?: string | undefined;
}

/** Component-only module so Vite Fast Refresh can accept this boundary. */
export function WorkbenchCommandManagementSettings() {
  const { groups, lastRun, runCommand, totalCount } = useCommandManagementModel();

  return (
    <CommandManagementPanel
      groups={groups}
      lastRun={lastRun}
      summaryLabel={`${totalCount} registered command${totalCount === 1 ? '' : 's'} · auto-updated from extensions`}
      onRunCommand={runCommand}
    />
  );
}

export function WorkbenchExtensionManagementSettings({
  catalogTrustPolicy,
  catalogUrl,
}: {
  catalogTrustPolicy?: ExtensionCatalogTrustPolicy | undefined;
  catalogUrl?: string | undefined;
}) {
  const {
    browseEntries,
    catalogError,
    catalogLoading,
    installCatalogEntry,
    installedEntries,
    installTrustRecords,
    rememberInstallTrust,
    toggleInstalledEntry,
  } = useExtensionManagementModel({ catalogTrustPolicy, catalogUrl });

  const isInstallTrusted = useCallback(
    (entry: (typeof browseEntries)[number]) =>
      isExtensionInstallTrusted(entry.id, entry.installPlan?.permissions ?? [], installTrustRecords),
    [installTrustRecords],
  );

  return (
    <ExtensionManagementPanel
      browseEntries={browseEntries}
      catalogError={catalogError}
      catalogLoading={catalogLoading}
      installedEntries={installedEntries}
      isInstallTrusted={isInstallTrusted}
      onInstall={installCatalogEntry}
      onRememberInstallTrust={rememberInstallTrust}
      onToggleEnabled={toggleInstalledEntry}
    />
  );
}

export function WorkbenchAccountManagementSettings({
  accountManagement,
}: {
  accountManagement: WorkbenchAccountManagementInput;
}) {
  return (
    <AccountManagementPanel
      automationHint="Linked accounts are project integrations exposed by extensions or host providers. Your Workbench service profile is managed from the profile menu."
      emptyLabel="No linked project accounts are configured."
      {...accountManagement}
    />
  );
}
