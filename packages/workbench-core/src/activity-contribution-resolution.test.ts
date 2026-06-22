import { describe, expect, it } from 'vitest';

import { filterActivitiesByWhenClause } from './activity-contribution-resolution.js';
import type { WorkbenchActivityContribution } from './registries.js';

const adminKeys = {
  'workbench.permissions.canManageCommands': true,
};
const basicKeys = {
  'workbench.permissions.canManageCommands': false,
};

const sampleActivities = [
  {
    extensionId: 'workbench-kit.builtin.explorer',
    icon: 'files',
    id: 'explorer.activity',
    title: 'Explorer',
    viewContainerId: 'explorer',
  },
  {
    extensionId: 'workbench-kit.builtin.commands',
    icon: 'terminal',
    id: 'commands.activity',
    title: 'Commands',
    viewContainerId: 'commands',
    when: 'workbench.permissions.canManageCommands',
  },
] satisfies WorkbenchActivityContribution[];

describe('filterActivitiesByWhenClause', () => {
  it('keeps activities without when clauses and filters gated activities', () => {
    expect(filterActivitiesByWhenClause(sampleActivities, adminKeys).map((activity) => activity.id)).toEqual(
      ['explorer.activity', 'commands.activity'],
    );
    expect(filterActivitiesByWhenClause(sampleActivities, basicKeys).map((activity) => activity.id)).toEqual(
      ['explorer.activity'],
    );
  });
});
