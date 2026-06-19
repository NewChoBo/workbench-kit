export type CommandManagementEntryStatus = 'available' | 'disabled' | 'no-handler';

export interface CommandManagementEntry {
  readonly category?: string | undefined;
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
