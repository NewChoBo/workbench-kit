import { Badge, SegmentedControl } from '@workbench-kit/react/primitives';
import type { WorkbenchPermissionRole } from '@workbench-kit/platform';

import {
  SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS,
  formatSamplePermissionRoleLabel,
  resolveSamplePermissionRoleOptionId,
  resolveSamplePermissionRoleOverrideFromOptionId,
} from './sample-permission-role-controls.js';
import type { SamplePermissionRoleOverride } from './sample-permission-role-storage.js';

export interface SamplePermissionRoleProfileExtraInput {
  authDerivedRole: WorkbenchPermissionRole;
  roleOverride: SamplePermissionRoleOverride;
  onRoleOverrideChange: (roleOverride: SamplePermissionRoleOverride) => void;
}

export function createSamplePermissionRoleProfileExtra({
  authDerivedRole,
  roleOverride,
  onRoleOverrideChange,
}: SamplePermissionRoleProfileExtraInput) {
  const selectedOptionId = resolveSamplePermissionRoleOptionId(roleOverride);
  const effectiveRole = roleOverride ?? authDerivedRole;

  return (
    <section
      aria-label="Permission role demo"
      className="workbench-profile-section workbench-sample-permission-role-profile"
    >
      <div className="workbench-sample-permission-role-profile__header">
        <h3>Permission (demo)</h3>
        <Badge variant="muted">Demo</Badge>
      </div>
      <p className="workbench-sample-permission-role-profile__summary">
        Current role: <strong>{formatSamplePermissionRoleLabel(effectiveRole)}</strong>
        {selectedOptionId === 'auth' ? (
          <>
            {' '}
            (from sign-in: {formatSamplePermissionRoleLabel(authDerivedRole)})
          </>
        ) : null}
      </p>
      <SegmentedControl
        ariaLabel="Permission role (demo)"
        options={SAMPLE_PERMISSION_ROLE_OVERRIDE_OPTIONS.map((option) => ({
          label: option.label,
          testId: `sample-permission-role-profile-${option.id}`,
          value: option.id,
        }))}
        value={selectedOptionId}
        onChange={(nextValue) => {
          const nextOverride = resolveSamplePermissionRoleOverrideFromOptionId(nextValue);
          if (nextOverride !== undefined) {
            onRoleOverrideChange(nextOverride);
          }
        }}
      />
      <p className="workbench-sample-permission-role-profile__hint">
        Switch to Basic to hide Settings while keeping this profile menu available.
      </p>
    </section>
  );
}
