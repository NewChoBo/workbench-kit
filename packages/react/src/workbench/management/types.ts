export type CommandManagementEntryStatus = 'available' | 'disabled' | 'no-handler';

export interface CommandManagementEntry {
  readonly category?: string | undefined;
  readonly description?: string | undefined;
  readonly id: string;
  readonly keybinding?: string | undefined;
  readonly label: string;
  readonly menuSurfaces?: readonly string[] | undefined;
  readonly source: string;
  readonly sourceLabel: string;
  readonly status: CommandManagementEntryStatus;
}

export interface CommandManagementGroup {
  readonly entries: readonly CommandManagementEntry[];
  readonly id: string;
  readonly label: string;
}

export interface CommandManagementRunState {
  readonly commandId: string;
  readonly message?: string | undefined;
  readonly status: 'running' | 'success' | 'error';
  readonly timestamp: number;
}

export type AccountManagementEntryStatus = 'active' | 'signed-out' | 'expired';

export interface AccountManagementEntry {
  readonly displayName: string;
  readonly email?: string | undefined;
  readonly id: string;
  readonly providerId: string;
  readonly providerLabel?: string | undefined;
  readonly status?: AccountManagementEntryStatus | undefined;
}

export interface AccountManagementPanelProps {
  accounts: readonly AccountManagementEntry[];
  activeAccountId?: string | undefined;
  automationHint?: string | undefined;
  className?: string | undefined;
  emptyLabel?: string | undefined;
  onSignOut?: ((accountId: string) => void) | undefined;
  sessionLabel?: string | undefined;
}

export interface CommandManagementPanelProps {
  className?: string | undefined;
  emptyLabel?: string | undefined;
  groups: readonly CommandManagementGroup[];
  lastRun?: CommandManagementRunState | undefined;
  onRunCommand?: ((commandId: string) => void | Promise<void>) | undefined;
  query?: string | undefined;
  summaryLabel?: string | undefined;
}

export type ExtensionManagementEntrySource = 'bundled' | 'installed';

export interface ExtensionManagementFeatureItem {
  readonly description?: string | undefined;
  readonly id: string;
  readonly label: string;
}

export interface ExtensionManagementFeatureSummary {
  readonly capabilities?: {
    readonly provides: readonly string[];
    readonly requires: readonly string[];
  };
  readonly commands?: readonly ExtensionManagementFeatureItem[] | undefined;
  readonly documentViews?: readonly ExtensionManagementFeatureItem[] | undefined;
  readonly menus?: readonly ExtensionManagementFeatureItem[] | undefined;
  readonly permissions?: readonly string[] | undefined;
  readonly settings?: readonly ExtensionManagementFeatureItem[] | undefined;
  readonly views?: readonly ExtensionManagementFeatureItem[] | undefined;
}

export interface ExtensionManagementDiagnosticSummary {
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface ExtensionInstallPlanSummary {
  readonly blocked: boolean;
  readonly diagnostics?: readonly ExtensionManagementDiagnosticSummary[] | undefined;
  readonly enableExtensionIds?: readonly string[] | undefined;
  readonly installExtensionIds?: readonly string[] | undefined;
  readonly permissions?: readonly string[] | undefined;
  readonly requiresApproval: boolean;
}

export interface ExtensionManagementEntry {
  readonly category: string;
  readonly description?: string | undefined;
  readonly diagnostics?: readonly ExtensionManagementDiagnosticSummary[] | undefined;
  readonly displayName: string;
  readonly enabled: boolean;
  readonly features?: ExtensionManagementFeatureSummary | undefined;
  readonly id: string;
  readonly installedAt?: string | undefined;
  readonly manifestUrl?: string | undefined;
  readonly source: ExtensionManagementEntrySource;
}

export interface ExtensionCatalogBrowseEntry {
  readonly category: string;
  readonly description: string;
  readonly displayName: string;
  readonly icon?: string | undefined;
  readonly id: string;
  readonly installPlan?: ExtensionInstallPlanSummary | undefined;
  readonly installed: boolean;
  readonly manifestUrl: string;
}

export interface ExtensionManagementPanelProps {
  browseEntries: readonly ExtensionCatalogBrowseEntry[];
  catalogError?: string | undefined;
  catalogLoading?: boolean | undefined;
  className?: string | undefined;
  installedEntries: readonly ExtensionManagementEntry[];
  onInstall?: ((entry: ExtensionCatalogBrowseEntry) => void) | undefined;
  onToggleEnabled?: ((entry: ExtensionManagementEntry, enabled: boolean) => void) | undefined;
}
