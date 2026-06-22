import { Field, Select } from '@workbench-kit/react/primitives';
import { WorkbenchSettingsSection } from '@workbench-kit/react/workbench/settings';
import type { WorkbenchPermissionRole } from '@workbench-kit/platform';
import type { WorkbenchSettingsCategory } from '@workbench-kit/react/workbench/settings';

import type { SamplePermissionRoleOverride } from './sample-permission-role-storage.js';
import {
  SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS,
  resolveSamplePermissionRoleOptionId,
  resolveSamplePermissionRoleOverrideFromOptionId,
} from './sample-permission-role-controls.js';

export const SAMPLE_PERMISSION_ROLE_SETTINGS_CATEGORY_ID = 'workbench.sample.permissions-demo';

const ROLE_OVERRIDE_OPTIONS = SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS;

export interface SamplePermissionRoleSettingsInput {
  authDerivedRole: WorkbenchPermissionRole;
  roleOverride: SamplePermissionRoleOverride;
  onRoleOverrideChange: (roleOverride: SamplePermissionRoleOverride) => void;
}

export function createSamplePermissionRoleSettingsCategory({
  authDerivedRole,
  roleOverride,
  onRoleOverrideChange,
}: SamplePermissionRoleSettingsInput): WorkbenchSettingsCategory {
  return {
    content: (
      <SamplePermissionRoleSettingsSection
        authDerivedRole={authDerivedRole}
        roleOverride={roleOverride}
        onRoleOverrideChange={onRoleOverrideChange}
      />
    ),
    id: SAMPLE_PERMISSION_ROLE_SETTINGS_CATEGORY_ID,
    label: 'Permissions (demo)',
    title: 'Permission role (demo)',
  };
}

function SamplePermissionRoleSettingsSection({
  authDerivedRole,
  roleOverride,
  onRoleOverrideChange,
}: SamplePermissionRoleSettingsInput) {
  const selectedOptionId = resolveSamplePermissionRoleOptionId(roleOverride);
  const effectiveRole = roleOverride ?? authDerivedRole;

  return (
    <WorkbenchSettingsSection
      id="workbench-sample-permission-role"
      title="Permission role (demo)"
      description="Temporary sample-host override for activity bar and settings visibility. Does not change the signed-in account."
    >
      <div className="workbench-sample-permission-role-settings">
        <Field
          className="workbench-sample-permission-role-settings__field"
          label="Permission role (demo)"
          description={`Signed-in account maps to ${authDerivedRole}. Choose Admin or Basic to override without signing out. Effective role: ${effectiveRole}.`}
        >
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
            {ROLE_OVERRIDE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <p className="workbench-sample-permission-role-settings__hint">
          If Settings is hidden while Basic is active, open Profile and switch roles here or run{' '}
          <strong>Permission Role (Demo)</strong> from the command palette.
        </p>
      </div>
    </WorkbenchSettingsSection>
  );
}
