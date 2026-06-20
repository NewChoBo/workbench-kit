import {
  AccountManagementPanel,
  CommandManagementPanel,
  type AccountManagementEntry,
} from '@workbench-kit/react/workbench/management';
import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';

import { useCommandManagementModel } from './use-command-management.js';
import { WorkbenchKeybindingManagementSettings } from './keybinding-management-settings.js';
import {
  MANAGE_ACCOUNTS_COMMAND_ID,
  MANAGE_COMMANDS_COMMAND_ID,
  MANAGE_KEYBINDINGS_COMMAND_ID,
} from './management-settings-ids.js';

export {
  MANAGE_ACCOUNTS_COMMAND_ID,
  MANAGE_COMMANDS_COMMAND_ID,
  MANAGE_KEYBINDINGS_COMMAND_ID,
  WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID,
  WORKBENCH_COMMANDS_SETTINGS_CATEGORY_ID,
  WORKBENCH_KEYBINDINGS_SETTINGS_CATEGORY_ID,
} from './management-settings-ids.js';

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
