import { describe, expect, it } from 'vitest';

import {
  ExtensionCapabilityRequiredError,
  ExtensionPermissionDeniedError,
  assertCapabilityAccess,
  assertPermission,
  requireCapability,
} from './permissions.js';

describe('runtime permission helpers', () => {
  it('allows declared permissions and denies missing ones', () => {
    const ctx = {
      extensionId: 'ext.demo',
      permissions: ['account.read', 'secrets.read'],
    };

    expect(() => assertPermission(ctx, 'secrets.read')).not.toThrow();
    expect(() => assertPermission(ctx, 'secrets.write')).toThrow(ExtensionPermissionDeniedError);
  });

  it('allows declared capability requires and denies missing ones', () => {
    const ctx = {
      extensionId: 'ext.demo',
      requiredCapabilities: ['workbench.auth'],
    };

    expect(() => requireCapability(ctx, 'workbench.auth')).not.toThrow();
    expect(() => requireCapability(ctx, 'workbench.secrets')).toThrow(
      ExtensionCapabilityRequiredError,
    );
  });

  it('gates sensitive capability access on requires + permission', () => {
    const allowed = {
      extensionId: 'ext.demo',
      permissions: ['account.read'],
      requiredCapabilities: ['workbench.auth'],
    };
    const missingPermission = {
      extensionId: 'ext.demo',
      permissions: [],
      requiredCapabilities: ['workbench.auth'],
    };
    const workspaceAllowed = {
      extensionId: 'ext.demo',
      permissions: ['workspace.read'],
      requiredCapabilities: ['workbench.workspace'],
    };
    const workspaceMissingRequires = {
      extensionId: 'ext.demo',
      permissions: ['workspace.read'],
      requiredCapabilities: [],
    };

    expect(() => assertCapabilityAccess(allowed, 'workbench.auth')).not.toThrow();
    expect(() => assertCapabilityAccess(workspaceAllowed, 'workbench.workspace')).not.toThrow();
    expect(() => assertCapabilityAccess(missingPermission, 'workbench.auth')).toThrow(
      ExtensionPermissionDeniedError,
    );
    expect(() => assertCapabilityAccess(workspaceMissingRequires, 'workbench.workspace')).toThrow(
      ExtensionCapabilityRequiredError,
    );
    expect(() =>
      assertCapabilityAccess(
        {
          extensionId: 'ext.demo',
          permissions: [],
          requiredCapabilities: ['workbench.workspace'],
        },
        'workbench.workspace',
      ),
    ).toThrow(ExtensionPermissionDeniedError);
    // Unlisted capability ids stay unrestricted in v1.
    expect(() => assertCapabilityAccess(allowed, 'workbench.test.capability')).not.toThrow();
  });
});
