import { describe, expect, it } from 'vitest';

import { WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID } from './management-settings-ids.js';
import {
  createWorkbenchSecondaryActivityItems,
  getWorkbenchSecondaryActivityRoute,
  WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID,
  WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID,
} from './shell-secondary-actions.js';

describe('shell secondary activity actions', () => {
  it('places account management above settings when account management is available', () => {
    expect(
      createWorkbenchSecondaryActivityItems({
        hasAccountManagement: true,
        isSettingsOpen: false,
      }).map((item) => item.id),
    ).toEqual([WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID, WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID]);
  });

  it('keeps settings as the only secondary action without account management', () => {
    expect(
      createWorkbenchSecondaryActivityItems({
        hasAccountManagement: false,
        isSettingsOpen: false,
      }).map((item) => item.id),
    ).toEqual([WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID]);
  });

  it('resolves active state from the open settings category', () => {
    expect(
      createWorkbenchSecondaryActivityItems({
        hasAccountManagement: true,
        isSettingsOpen: true,
        settingsCategoryId: WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID,
      }).map((item) => [item.id, item.active]),
    ).toEqual([
      [WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID, true],
      [WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID, false],
    ]);

    expect(
      createWorkbenchSecondaryActivityItems({
        hasAccountManagement: true,
        isSettingsOpen: true,
        settingsCategoryId: 'workbench.appearance',
      }).map((item) => [item.id, item.active]),
    ).toEqual([
      [WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID, false],
      [WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID, true],
    ]);
  });

  it('routes fixed secondary activity item IDs', () => {
    expect(getWorkbenchSecondaryActivityRoute(WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID)).toBe('accounts');
    expect(getWorkbenchSecondaryActivityRoute(WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID)).toBe(
      'settings',
    );
    expect(getWorkbenchSecondaryActivityRoute('workbench-kit.builtin.explorer')).toBeUndefined();
  });
});
