import { describe, expect, it } from 'vitest';

import { createWorkbenchPermissionContextKeys } from '@workbench-kit/platform';

import { filterActivitiesByWhenClause } from './activity-contribution-resolution.js';
import type { WorkbenchActivityContribution } from './registries.js';

const sampleActivities = [
  {
    extensionId: 'workbench-kit.builtin.explorer',
    icon: 'files',
    id: 'explorer.activity',
    title: 'Explorer',
    viewContainerId: 'explorer',
  },
  {
    extensionId: 'workbench-kit.builtin.search',
    icon: 'search',
    id: 'search.activity',
    title: 'Search',
    viewContainerId: 'search',
    when: 'workbench.permissions.canUseSearch',
  },
  {
    extensionId: 'workbench-kit.builtin.chat',
    icon: 'comment-discussion',
    id: 'chat.activity',
    title: 'Chat',
    viewContainerId: 'chatting',
    when: 'workbench.permissions.canUseChat',
  },
  {
    extensionId: 'workbench-kit.builtin.commands',
    icon: 'terminal',
    id: 'commands.activity',
    title: 'Commands',
    viewContainerId: 'commands',
    when: 'workbench.permissions.canManageCommands',
  },
  {
    extensionId: 'workbench-kit.builtin.extensions',
    icon: 'extensions',
    id: 'extensions.activity',
    title: 'Extensions',
    viewContainerId: 'extensions',
    when: 'workbench.permissions.canManageExtensions',
  },
] satisfies WorkbenchActivityContribution[];

function activityIdsForRole(
  role: 'owner' | 'maintainer' | 'developer' | 'reporter' | 'viewer',
): string[] {
  return filterActivitiesByWhenClause(
    sampleActivities,
    createWorkbenchPermissionContextKeys({ role }),
  ).map((activity) => activity.id);
}

describe('filterActivitiesByWhenClause', () => {
  it('keeps activities without when clauses for every tier', () => {
    for (const role of ['owner', 'maintainer', 'developer', 'reporter', 'viewer'] as const) {
      expect(activityIdsForRole(role)).toContain('explorer.activity');
    }
  });

  it('maps permission tiers to the default activity bar set', () => {
    expect(activityIdsForRole('owner')).toEqual([
      'explorer.activity',
      'search.activity',
      'chat.activity',
      'commands.activity',
      'extensions.activity',
    ]);
    expect(activityIdsForRole('maintainer')).toEqual([
      'explorer.activity',
      'search.activity',
      'chat.activity',
      'commands.activity',
      'extensions.activity',
    ]);
    expect(activityIdsForRole('developer')).toEqual([
      'explorer.activity',
      'search.activity',
      'chat.activity',
    ]);
    expect(activityIdsForRole('reporter')).toEqual(['explorer.activity', 'chat.activity']);
    expect(activityIdsForRole('viewer')).toEqual(['explorer.activity']);
  });

  it('accepts deprecated admin/basic aliases through context key helpers', () => {
    expect(
      filterActivitiesByWhenClause(
        sampleActivities,
        createWorkbenchPermissionContextKeys({ role: 'admin' }),
      ).map((activity) => activity.id),
    ).toEqual(activityIdsForRole('owner'));
    expect(
      filterActivitiesByWhenClause(
        sampleActivities,
        createWorkbenchPermissionContextKeys({ role: 'basic' }),
      ).map((activity) => activity.id),
    ).toEqual(activityIdsForRole('viewer'));
  });
});
