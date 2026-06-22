import {
  createWorkbenchPermissionContextKeys,
  type ContextKeyValue,
  type WorkbenchPermissionRole,
} from '@workbench-kit/platform';
import type { WorkbenchExtensionsConfig } from '@workbench-kit/workbench-config';

import { extensionsConfig } from './bootstrap.js';
import type { SamplePermissionRoleOverride } from './sample-permission-role-storage.js';

const VIEWER_ROLE_EXTENSION_IDS = [
  'workbench-kit.builtin.accounts',
  'workbench-kit.builtin.editor',
  'workbench-kit.builtin.explorer',
  'workbench-kit.builtin.keybindings',
  'workbench-kit.builtin.workspace',
] as const;

const REPORTER_ROLE_EXTENSION_IDS = [
  ...VIEWER_ROLE_EXTENSION_IDS,
  'workbench-kit.builtin.chat',
] as const;

const DEVELOPER_ROLE_EXTENSION_IDS = [
  ...REPORTER_ROLE_EXTENSION_IDS,
  'workbench-kit.builtin.search',
] as const;

const MAINTAINER_ROLE_EXTENSION_IDS = [
  ...DEVELOPER_ROLE_EXTENSION_IDS,
  'workbench-kit.builtin.commands',
  'workbench-kit.builtin.extensions',
  'workbench-kit.samples.theme-alt',
] as const;

const OWNER_ROLE_EXTENSION_IDS = extensionsConfig.enabled;

function resolveEnabledExtensionsForRole(role: WorkbenchPermissionRole): readonly string[] {
  switch (role) {
    case 'owner':
      return OWNER_ROLE_EXTENSION_IDS;
    case 'maintainer':
      return MAINTAINER_ROLE_EXTENSION_IDS;
    case 'developer':
      return DEVELOPER_ROLE_EXTENSION_IDS;
    case 'reporter':
      return REPORTER_ROLE_EXTENSION_IDS;
    case 'viewer':
      return VIEWER_ROLE_EXTENSION_IDS;
  }
}

export function resolveSampleWorkbenchRole(accountId: string | undefined): WorkbenchPermissionRole {
  return accountId === 'basic' ? 'viewer' : 'owner';
}

export function resolveSampleEffectiveRole(
  accountId: string | undefined,
  roleOverride?: SamplePermissionRoleOverride,
): WorkbenchPermissionRole {
  if (roleOverride !== null && roleOverride !== undefined) {
    return roleOverride;
  }

  return resolveSampleWorkbenchRole(accountId);
}

export function createSamplePermissionContextKeys(
  accountId: string | undefined,
  roleOverride?: SamplePermissionRoleOverride,
): Readonly<Record<string, ContextKeyValue>> {
  return createWorkbenchPermissionContextKeys({
    role: resolveSampleEffectiveRole(accountId, roleOverride),
  });
}

export function resolveSampleExtensionsConfig(
  accountId: string | undefined,
  roleOverride?: SamplePermissionRoleOverride,
): WorkbenchExtensionsConfig {
  const effectiveRole = resolveSampleEffectiveRole(accountId, roleOverride);
  const enabled = new Set<string>(resolveEnabledExtensionsForRole(effectiveRole));

  if (enabled.size === extensionsConfig.enabled.length) {
    return extensionsConfig;
  }

  return {
    ...extensionsConfig,
    enabled: extensionsConfig.enabled.filter((extensionId) => enabled.has(extensionId)),
  };
}
