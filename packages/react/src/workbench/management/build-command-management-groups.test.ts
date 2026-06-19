import { describe, expect, it } from 'vitest';
import {
  buildCommandManagementGroups,
  countCommandManagementEntries,
  filterCommandManagementGroups,
} from './build-command-management-groups.js';

describe('buildCommandManagementGroups', () => {
  it('groups extension and shell commands with metadata', () => {
    const groups = buildCommandManagementGroups({
      extensionCommands: [
        {
          category: 'Accounts',
          extensionId: 'workbench-kit.builtin.accounts',
          extensionLabel: 'Accounts',
          handler: () => undefined,
          id: 'workbench-kit.builtin.accounts.manage',
          label: 'Manage Accounts',
        },
      ],
      keybindingsByCommandId: {
        'workbench.openSettings': 'Ctrl+,',
      },
      menuSurfacesByCommandId: {
        'workbench-kit.builtin.accounts.manage': ['status/account'],
      },
      shellCommands: [
        {
          category: 'Workbench',
          handler: () => undefined,
          id: 'workbench.openSettings',
          label: 'Open Settings',
        },
      ],
    });

    expect(countCommandManagementEntries(groups)).toBe(2);
    expect(groups[0]?.label).toBe('Accounts');
    expect(groups[1]?.label).toBe('Workbench Shell');
    expect(filterCommandManagementGroups(groups, 'settings')).toHaveLength(1);
  });
});
