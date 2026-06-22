import type { ContextKeyValue } from './context-key-value.js';

/** Host-owned permission context keys for `when` clauses on activities, commands, and menus. */
export const WORKBENCH_PERMISSION_CONTEXT_KEY_ROLE = 'workbench.permissions.role' as const;
export const WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_MANAGE_COMMANDS =
  'workbench.permissions.canManageCommands' as const;
export const WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_OPEN_SETTINGS =
  'workbench.permissions.canOpenSettings' as const;
export const WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_USE_CHAT =
  'workbench.permissions.canUseChat' as const;

export type WorkbenchPermissionRole = 'admin' | 'basic';

export interface WorkbenchPermissionContextInput {
  readonly role: WorkbenchPermissionRole;
}

export function createWorkbenchPermissionContextKeys(
  input: WorkbenchPermissionContextInput,
): Readonly<Record<string, ContextKeyValue>> {
  const isAdmin = input.role === 'admin';

  return {
    [WORKBENCH_PERMISSION_CONTEXT_KEY_ROLE]: input.role,
    [WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_MANAGE_COMMANDS]: isAdmin,
    [WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_OPEN_SETTINGS]: isAdmin,
    [WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_USE_CHAT]: true,
  };
}
