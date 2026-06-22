import type { ContextKeyValue } from './context-key-value.js';

/** Host-owned permission context keys for `when` clauses on activities, commands, and menus. */
export const WORKBENCH_PERMISSION_CONTEXT_KEY_ROLE = 'workbench.permissions.role' as const;
export const WORKBENCH_PERMISSION_CONTEXT_KEY_TIER = 'workbench.permissions.tier' as const;
export const WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_MANAGE_COMMANDS =
  'workbench.permissions.canManageCommands' as const;
export const WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_OPEN_SETTINGS =
  'workbench.permissions.canOpenSettings' as const;
export const WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_USE_CHAT =
  'workbench.permissions.canUseChat' as const;
export const WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_USE_SEARCH =
  'workbench.permissions.canUseSearch' as const;
export const WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_MANAGE_EXTENSIONS =
  'workbench.permissions.canManageExtensions' as const;

/** Product-neutral permission tiers inspired by common VCS role models. */
export type WorkbenchPermissionRole =
  | 'owner'
  | 'maintainer'
  | 'developer'
  | 'reporter'
  | 'viewer';

/**
 * Deprecated aliases kept for backward compatibility.
 * Prefer `owner` and `viewer`.
 */
export type WorkbenchPermissionRoleDeprecatedAlias = 'admin' | 'basic';

export type WorkbenchPermissionRoleInput =
  | WorkbenchPermissionRole
  | WorkbenchPermissionRoleDeprecatedAlias;

export interface WorkbenchPermissionContextInput {
  readonly role: WorkbenchPermissionRoleInput;
}

export interface WorkbenchPermissionCapabilities {
  readonly role: WorkbenchPermissionRole;
  readonly tier: number;
  readonly canManageCommands: boolean;
  readonly canOpenSettings: boolean;
  readonly canUseChat: boolean;
  readonly canUseSearch: boolean;
  readonly canManageExtensions: boolean;
}

const ROLE_ALIASES: Readonly<Record<WorkbenchPermissionRoleDeprecatedAlias, WorkbenchPermissionRole>> =
  {
    admin: 'owner',
    basic: 'viewer',
  };

export function normalizeWorkbenchPermissionRole(
  role: WorkbenchPermissionRoleInput,
): WorkbenchPermissionRole {
  if (role === 'admin' || role === 'basic') {
    return ROLE_ALIASES[role];
  }

  return role;
}

export function resolveWorkbenchPermissionCapabilities(
  role: WorkbenchPermissionRoleInput,
): WorkbenchPermissionCapabilities {
  const normalizedRole = normalizeWorkbenchPermissionRole(role);

  switch (normalizedRole) {
    case 'owner':
      return {
        role: normalizedRole,
        tier: 5,
        canManageCommands: true,
        canOpenSettings: true,
        canUseChat: true,
        canUseSearch: true,
        canManageExtensions: true,
      };
    case 'maintainer':
      return {
        role: normalizedRole,
        tier: 4,
        canManageCommands: true,
        canOpenSettings: false,
        canUseChat: true,
        canUseSearch: true,
        canManageExtensions: true,
      };
    case 'developer':
      return {
        role: normalizedRole,
        tier: 3,
        canManageCommands: false,
        canOpenSettings: false,
        canUseChat: true,
        canUseSearch: true,
        canManageExtensions: false,
      };
    case 'reporter':
      return {
        role: normalizedRole,
        tier: 2,
        canManageCommands: false,
        canOpenSettings: false,
        canUseChat: true,
        canUseSearch: false,
        canManageExtensions: false,
      };
    case 'viewer':
      return {
        role: normalizedRole,
        tier: 1,
        canManageCommands: false,
        canOpenSettings: false,
        canUseChat: false,
        canUseSearch: false,
        canManageExtensions: false,
      };
  }
}

export function createWorkbenchPermissionContextKeys(
  input: WorkbenchPermissionContextInput,
): Readonly<Record<string, ContextKeyValue>> {
  const capabilities = resolveWorkbenchPermissionCapabilities(input.role);

  return {
    [WORKBENCH_PERMISSION_CONTEXT_KEY_ROLE]: capabilities.role,
    [WORKBENCH_PERMISSION_CONTEXT_KEY_TIER]: capabilities.tier,
    [WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_MANAGE_COMMANDS]: capabilities.canManageCommands,
    [WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_OPEN_SETTINGS]: capabilities.canOpenSettings,
    [WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_USE_CHAT]: capabilities.canUseChat,
    [WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_USE_SEARCH]: capabilities.canUseSearch,
    [WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_MANAGE_EXTENSIONS]: capabilities.canManageExtensions,
  };
}
