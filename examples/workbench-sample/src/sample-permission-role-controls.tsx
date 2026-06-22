import { Select } from '@workbench-kit/react/primitives';
import type { WorkbenchPermissionRole } from '@workbench-kit/platform';

import type { SamplePermissionRoleOverride } from './sample-permission-role-storage.js';

const SAMPLE_PERMISSION_ROLE_LABELS = {
  owner: 'Owner',
  maintainer: 'Maintainer',
  developer: 'Developer',
  reporter: 'Reporter',
  viewer: 'Viewer',
} as const satisfies Readonly<Record<WorkbenchPermissionRole, string>>;

export const SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS = [
  { id: 'auth', label: 'Use sign-in role' },
  ...(Object.entries(SAMPLE_PERMISSION_ROLE_LABELS) as Array<
    [WorkbenchPermissionRole, string]
  >).map(([id, label]) => ({ id, label })),
] as const;

export type SamplePermissionRoleOptionId =
  (typeof SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS)[number]['id'];

const SAMPLE_PERMISSION_ROLE_OPTION_IDS = new Set(
  SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS.map((option) => option.id),
);

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

  if (SAMPLE_PERMISSION_ROLE_OPTION_IDS.has(optionId as SamplePermissionRoleOptionId)) {
    return optionId as WorkbenchPermissionRole;
  }

  return undefined;
}

export function formatSamplePermissionRoleLabel(role: WorkbenchPermissionRole): string {
  return SAMPLE_PERMISSION_ROLE_LABELS[role];
}

export interface SamplePermissionRoleOverrideSelectProps {
  onRoleOverrideChange: (roleOverride: SamplePermissionRoleOverride) => void;
  roleOverride: SamplePermissionRoleOverride;
}

export function SamplePermissionRoleOverrideSelect({
  onRoleOverrideChange,
  roleOverride,
}: SamplePermissionRoleOverrideSelectProps) {
  const selectedOptionId = resolveSamplePermissionRoleOptionId(roleOverride);

  return (
    <Select
      aria-label="Permission role (demo)"
      controlWidth="full"
      value={selectedOptionId}
      onValueChange={(nextValue) => {
        const nextOverride = resolveSamplePermissionRoleOverrideFromOptionId(nextValue);
        if (nextOverride !== undefined) {
          onRoleOverrideChange(nextOverride);
        }
      }}
    >
      {SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
