import type { WorkbenchPermissionRole } from '@workbench-kit/platform';

import type { SamplePermissionRoleOverride } from './sample-permission-role-storage.js';

export const SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS = [
  { id: 'auth', label: 'Use sign-in role' },
  { id: 'owner', label: 'Owner' },
  { id: 'maintainer', label: 'Maintainer' },
  { id: 'developer', label: 'Developer' },
  { id: 'reporter', label: 'Reporter' },
  { id: 'viewer', label: 'Viewer' },
] as const;

export type SamplePermissionRoleOptionId =
  (typeof SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS)[number]['id'];

const SAMPLE_PERMISSION_ROLE_LABELS: Readonly<Record<WorkbenchPermissionRole, string>> = {
  owner: 'Owner',
  maintainer: 'Maintainer',
  developer: 'Developer',
  reporter: 'Reporter',
  viewer: 'Viewer',
};

export function resolveSamplePermissionRoleOptionId(
  roleOverride: SamplePermissionRoleOverride,
): SamplePermissionRoleOptionId {
  if (roleOverride !== null) {
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

  if (
    optionId === 'owner' ||
    optionId === 'maintainer' ||
    optionId === 'developer' ||
    optionId === 'reporter' ||
    optionId === 'viewer'
  ) {
    return optionId;
  }

  return undefined;
}

export function formatSamplePermissionRoleLabel(role: WorkbenchPermissionRole): string {
  return SAMPLE_PERMISSION_ROLE_LABELS[role];
}
