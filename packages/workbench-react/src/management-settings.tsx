import {
  AccountManagementPanel,
  CommandManagementPanel,
  type AccountManagementEntry,
} from '@workbench-kit/react/workbench/management';
import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';

import { useCommandManagementModel } from './use-command-management.js';
import { WorkbenchKeybindingManagementSettings } from './keybinding-management-settings.js';

export const WORKBENCH_COMMANDS_SETTINGS_CATEGORY_ID = 'workbench-kit.shell.command-management' as const;
export const WORKBENCH_KEYBINDINGS_SETTINGS_CATEGORY_ID = 'workbench-kit.shell.keybinding-management' as const;
export const WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID = 'workbench-kit.shell.account-management' as const;
export const MANAGE_COMMANDS_COMMAND_ID = 'workbench-kit.shell.commands.manage' as const;
export const MANAGE_KEYBINDINGS_COMMAND_ID = 'workbench-kit.shell.keybindings.manage' as const;
export const MANAGE_ACCOUNTS_COMMAND_ID = 'workbench-kit.builtin.accounts.manage' as const;

export { WorkbenchKeybindingManagementSettings };

export function createWorkbenchManagementPaletteCommands(): readonly WorkbenchCommandDescriptor[] {
  return [
    {
      category: 'Workbench',
      icon: 'codicon-terminal',
      id: MANAGE_COMMANDS_COMMAND_ID,
      label: 'Manage Commands',
    },
    {
      category: 'Workbench',
      icon: 'codicon-keyboard',
      id: MANAGE_KEYBINDINGS_COMMAND_ID,
      label: 'Keyboard Shortcuts',
    },
    {
      category: 'Accounts',
      icon: 'codicon-account',
      id: MANAGE_ACCOUNTS_COMMAND_ID,
      label: 'Manage Accounts',
    },
  ];
}

export interface WorkbenchAccountManagementInput {
  accounts: readonly AccountManagementEntry[];
  activeAccountId?: string | undefined;
  automationHint?: string | undefined;
  emptyLabel?: string | undefined;
  onSignOut?: ((accountId: string) => void) | undefined;
  sessionLabel?: string | undefined;
}

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

export function WorkbenchAccountManagementSettings({
  accountManagement,
}: {
  accountManagement: WorkbenchAccountManagementInput;
}) {
  return <AccountManagementPanel {...accountManagement} />;
}
