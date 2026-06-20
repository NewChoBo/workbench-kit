import { describe, expect, it } from 'vitest';

import {
  createWorkbenchSecondaryActivityItems,
  getWorkbenchSecondaryActivityRoute,
  WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID,
  WORKBENCH_PROFILE_ACTIVITY_ITEM_ID,
  WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID,
} from './shell-secondary-actions.js';

describe('shell secondary activity actions', () => {
  it('places profile above settings when a profile is available', () => {
    expect(
      createWorkbenchSecondaryActivityItems({
        hasProfile: true,
        isProfileOpen: false,
        isSettingsOpen: false,
      }).map((item) => item.id),
    ).toEqual([WORKBENCH_PROFILE_ACTIVITY_ITEM_ID, WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID]);
  });

  it('keeps settings as the only secondary action without a profile', () => {
    expect(
      createWorkbenchSecondaryActivityItems({
        hasProfile: false,
        isProfileOpen: false,
        isSettingsOpen: false,
      }).map((item) => item.id),
    ).toEqual([WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID]);
  });

  it('resolves profile and settings active states independently', () => {
    expect(
      createWorkbenchSecondaryActivityItems({
        hasProfile: true,
        isProfileOpen: true,
        isSettingsOpen: true,
      }).map((item) => [item.id, item.active]),
    ).toEqual([
      [WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID, true],
      [WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID, true],
    ]);

    expect(
      createWorkbenchSecondaryActivityItems({
        hasProfile: true,
        isProfileOpen: false,
        isSettingsOpen: false,
      }).map((item) => [item.id, item.active]),
    ).toEqual([
      [WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID, false],
      [WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID, false],
    ]);
  });

  it('routes fixed secondary activity item IDs', () => {
    expect(getWorkbenchSecondaryActivityRoute(WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID)).toBe('profile');
    expect(getWorkbenchSecondaryActivityRoute(WORKBENCH_PROFILE_ACTIVITY_ITEM_ID)).toBe('profile');
    expect(getWorkbenchSecondaryActivityRoute(WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID)).toBe(
      'settings',
    );
    expect(getWorkbenchSecondaryActivityRoute('workbench-kit.builtin.explorer')).toBeUndefined();
  });
});
