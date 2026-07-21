import { Field } from '@workbench-kit/react/primitives';
import { WorkbenchSettingsSection } from '@workbench-kit/react/workbench/settings';
import type { WorkbenchPermissionRole } from '@workbench-kit/platform';
import type { WorkbenchSettingsCategory } from '@workbench-kit/react/workbench/settings';

import type { SamplePermissionRoleOverride } from './sample-permission-role-storage.js';
import {
  SamplePermissionRoleOverrideSelect,
  formatSamplePermissionRoleLabel,
} from './sample-permission-role-controls.js';

export const SAMPLE_PERMISSION_ROLE_SETTINGS_CATEGORY_ID = 'workbench.sample.permissions-demo';

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
          description={`Signed-in account maps to ${formatSamplePermissionRoleLabel(authDerivedRole)}. Override the demo role without signing out. Effective role: ${formatSamplePermissionRoleLabel(effectiveRole)}.`}
        >
          <SamplePermissionRoleOverrideSelect
            roleOverride={roleOverride}
            onRoleOverrideChange={onRoleOverrideChange}
          />
        </Field>
        <p className="workbench-sample-permission-role-settings__hint">
          If Settings is hidden for your tier, open Profile and switch roles here or run{' '}
          <strong>Permission Role (Demo)</strong> from the command palette.
        </p>
      </div>
    </WorkbenchSettingsSection>
  );
}
