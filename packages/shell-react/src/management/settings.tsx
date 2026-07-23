import {
  AccountManagementPanel,
  CommandManagementPanel,
  ExtensionManagementPanel,
  type AccountManagementEntry,
} from '@workbench-kit/react/workbench/management';

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
  catalogUrl,
}: {
  catalogUrl?: string | undefined;
}) {
  const {
    browseEntries,
    catalogError,
    catalogLoading,
    installCatalogEntry,
    installedEntries,
    toggleInstalledEntry,
  } = useExtensionManagementModel({ catalogUrl });

  return (
    <ExtensionManagementPanel
      browseEntries={browseEntries}
      catalogError={catalogError}
      catalogLoading={catalogLoading}
      installedEntries={installedEntries}
      onInstall={installCatalogEntry}
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
