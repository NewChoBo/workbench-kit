import type { WorkbenchCommandDescriptor } from '@workbench-kit/react/workbench';

import {
  MANAGE_ACCOUNTS_COMMAND_ID,
  MANAGE_COMMANDS_COMMAND_ID,
  MANAGE_EXTENSIONS_COMMAND_ID,
  MANAGE_KEYBINDINGS_COMMAND_ID,
} from './settings-ids.js';

/** Pure helper — kept out of React component modules for Fast Refresh. */
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
      category: 'Workbench',
      icon: 'codicon-extensions',
      id: MANAGE_EXTENSIONS_COMMAND_ID,
      label: 'Extensions',
    },
    {
      category: 'Accounts',
      icon: 'codicon-account',
      id: MANAGE_ACCOUNTS_COMMAND_ID,
      label: 'Manage Linked Accounts',
    },
  ];
}
