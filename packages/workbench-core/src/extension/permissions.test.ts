import { describe, expect, it } from 'vitest';

import {
  ExtensionCapabilityRequiredError,
  ExtensionPermissionDeniedError,
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
});
