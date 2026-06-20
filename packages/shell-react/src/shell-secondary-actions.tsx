import type { ActivityBarItem } from '@workbench-kit/react/workbench/shell';

export const WORKBENCH_PROFILE_ACTIVITY_ITEM_ID = 'workbench-kit.shell.profile' as const;
export const WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID = WORKBENCH_PROFILE_ACTIVITY_ITEM_ID;
export const WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID = 'workbench-kit.shell.settings' as const;

export type WorkbenchSecondaryActivityRoute = 'profile' | 'settings';

export interface WorkbenchSecondaryActivityItemsInput {
  hasProfile: boolean;
  isProfileOpen: boolean;
  isSettingsOpen: boolean;
}

export function createWorkbenchSecondaryActivityItems({
  hasProfile,
  isProfileOpen,
  isSettingsOpen,
}: WorkbenchSecondaryActivityItemsInput): ActivityBarItem[] {
  return [
    ...(hasProfile
      ? [
          {
            active: isProfileOpen,
            icon: <i aria-hidden="true" className="codicon codicon-account" />,
            id: WORKBENCH_PROFILE_ACTIVITY_ITEM_ID,
            label: 'Profile',
            title: 'Open profile',
          },
        ]
      : []),
    {
      active: isSettingsOpen,
      icon: <i aria-hidden="true" className="codicon codicon-settings-gear" />,
      id: WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID,
      label: 'Settings',
    },
  ];
}

export function getWorkbenchSecondaryActivityRoute(
  itemId: string,
): WorkbenchSecondaryActivityRoute | undefined {
  if (itemId === WORKBENCH_PROFILE_ACTIVITY_ITEM_ID) {
    return 'profile';
  }

  if (itemId === WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID) {
    return 'settings';
  }

  return undefined;
}
