import {
  createWorkbenchPermissionContextKeys,
  type ContextKeyValue,
  type WorkbenchPermissionRole,
} from '@workbench-kit/platform';
import type { WorkbenchExtensionsConfig } from '@workbench-kit/workbench-config';

import { extensionsConfig } from './bootstrap.js';

const BASIC_ROLE_EXTENSION_IDS = [
  'workbench-kit.builtin.accounts',
  'workbench-kit.builtin.chat',
  'workbench-kit.builtin.editor',
  'workbench-kit.builtin.explorer',
  'workbench-kit.builtin.keybindings',
  'workbench-kit.builtin.workspace',
] as const;

export function resolveSampleWorkbenchRole(accountId: string | undefined): WorkbenchPermissionRole {
  return accountId === 'basic' ? 'basic' : 'admin';
}

export function createSamplePermissionContextKeys(
  accountId: string | undefined,
): Readonly<Record<string, ContextKeyValue>> {
  return createWorkbenchPermissionContextKeys({
    role: resolveSampleWorkbenchRole(accountId),
  });
}

export function resolveSampleExtensionsConfig(
  accountId: string | undefined,
): WorkbenchExtensionsConfig {
  if (resolveSampleWorkbenchRole(accountId) === 'admin') {
    return extensionsConfig;
  }

  const enabled = new Set<string>(BASIC_ROLE_EXTENSION_IDS);

  return {
    ...extensionsConfig,
    enabled: extensionsConfig.enabled.filter((extensionId) => enabled.has(extensionId)),
  };
}
