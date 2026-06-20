import type { ActivityBarItem } from '@workbench-kit/react/workbench/shell';

import { WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID } from './management-settings-ids.js';

export const WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID = 'workbench-kit.shell.accounts' as const;
export const WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID = 'workbench-kit.shell.settings' as const;

export type WorkbenchSecondaryActivityRoute = 'accounts' | 'settings';

export interface WorkbenchSecondaryActivityItemsInput {
  hasAccountManagement: boolean;
  isSettingsOpen: boolean;
  settingsCategoryId?: string | undefined;
}

export function createWorkbenchSecondaryActivityItems({
  hasAccountManagement,
  isSettingsOpen,
  settingsCategoryId,
}: WorkbenchSecondaryActivityItemsInput): ActivityBarItem[] {
  return [
    ...(hasAccountManagement
      ? [
          {
            active:
              isSettingsOpen && settingsCategoryId === WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID,
            icon: <i aria-hidden="true" className="codicon codicon-account" />,
            id: WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID,
            label: 'Accounts',
            title: 'Manage accounts',
          },
        ]
      : []),
    {
      active: isSettingsOpen && settingsCategoryId !== WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID,
      icon: <i aria-hidden="true" className="codicon codicon-settings-gear" />,
      id: WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID,
      label: 'Settings',
    },
  ];
}

export function getWorkbenchSecondaryActivityRoute(
  itemId: string,
): WorkbenchSecondaryActivityRoute | undefined {
  if (itemId === WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID) {
    return 'accounts';
  }

  if (itemId === WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID) {
    return 'settings';
  }

  return undefined;
}
