import { Badge, Field } from '@workbench-kit/react/primitives';
import type { WorkbenchPermissionRole } from '@workbench-kit/platform';

import {
  SamplePermissionRoleOverrideSelect,
  formatSamplePermissionRoleLabel,
  resolveSamplePermissionRoleOptionId,
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
      <Field
        className="workbench-sample-permission-role-profile__field"
        label="Permission role (demo)"
        description="Switch tiers to compare Activity Bar visibility without signing out."
      >
        <SamplePermissionRoleOverrideSelect
          roleOverride={roleOverride}
          onRoleOverrideChange={onRoleOverrideChange}
        />
      </Field>
      <p className="workbench-sample-permission-role-profile__hint">
        Viewer shows Explorer only. Reporter adds Chat. Developer adds Search. Maintainer adds
        Commands and Extensions. Owner also shows Settings.
      </p>
    </section>
  );
}
