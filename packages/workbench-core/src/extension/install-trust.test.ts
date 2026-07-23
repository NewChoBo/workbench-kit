import { describe, expect, it } from 'vitest';

import {
  createExtensionInstallPermissionFingerprint,
  isExtensionInstallTrusted,
  recordExtensionInstallTrust,
  revokeExtensionInstallTrust,
} from './install-trust.js';

describe('extension install trust store', () => {
  it('fingerprints permissions stably regardless of order/duplicates', () => {
    expect(createExtensionInstallPermissionFingerprint(['b.write', 'a.read', 'a.read'])).toBe(
      createExtensionInstallPermissionFingerprint(['a.read', 'b.write']),
    );
  });

  it('treats matching fingerprint as trusted', () => {
    const records = recordExtensionInstallTrust('ext.a', ['workspace.write'], []);
    expect(isExtensionInstallTrusted('ext.a', ['workspace.write'], records)).toBe(true);
    expect(isExtensionInstallTrusted('ext.a', ['workspace.write', 'account.read'], records)).toBe(
      false,
    );
  });

  it('revokes all trust rows for an extension id', () => {
    const records = recordExtensionInstallTrust(
      'ext.a',
      ['account.read'],
      recordExtensionInstallTrust('ext.a', ['workspace.write'], []),
    );
    expect(revokeExtensionInstallTrust('ext.a', records)).toEqual([]);
  });
});
