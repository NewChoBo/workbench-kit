import type { WorkbenchPermissionRole } from '@workbench-kit/platform';

import type { SamplePermissionRoleOverride } from './sample-permission-role-storage.js';

export const SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS = [
  { id: 'auth', label: 'Use sign-in role' },
  { id: 'admin', label: 'Admin' },
  { id: 'basic', label: 'Basic' },
] as const;

export type SamplePermissionRoleOptionId =
  (typeof SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS)[number]['id'];

export function resolveSamplePermissionRoleOptionId(
  roleOverride: SamplePermissionRoleOverride,
): SamplePermissionRoleOptionId {
  if (roleOverride === 'admin' || roleOverride === 'basic') {
    return roleOverride;
  }

  return 'auth';
}

export function resolveSamplePermissionRoleOverrideFromOptionId(
  optionId: string,
): SamplePermissionRoleOverride | undefined {
  if (optionId === 'auth') {
    return null;
  }

  if (optionId === 'admin' || optionId === 'basic') {
    return optionId;
  }

  return undefined;
}

export function formatSamplePermissionRoleLabel(role: WorkbenchPermissionRole): string {
  return role === 'admin' ? 'Admin' : 'Basic';
}
