import { describe, expect, it, vi } from 'vitest';

import {
  createExtensionInstallPermissionFingerprint,
  isExtensionInstallTrusted,
  recordExtensionInstallTrust,
  revokeExtensionInstallTrust,
  saveExtensionInstallTrustRecords,
  saveExtensionInstallTrustRecordsResult,
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

  it('reports recoverable writes while preserving strict writer compatibility', () => {
    const records = recordExtensionInstallTrust('ext.a', ['workspace.write'], []);
    const storageKey = 'workbench-kit/.workbench/extension-install-trust/test';
    const writer = vi.fn(() => {
      throw new Error('BACKEND_SENSITIVE_DETAIL');
    });
    const storage = { setItem: writer };

    expect(() => saveExtensionInstallTrustRecords(records, storageKey, storage)).toThrow(
      'BACKEND_SENSITIVE_DETAIL',
    );

    const diagnostics: unknown[] = [];
    const result = saveExtensionInstallTrustRecordsResult(records, storageKey, storage, {
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    expect(writer).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      committed: false,
      diagnostic: {
        code: 'write_failed',
        message: 'Workbench storage value could not be written.',
        operation: 'write',
        storageKey,
      },
    });
    expect(diagnostics).toEqual([result.diagnostic]);
    expect(JSON.stringify({ diagnostics, result })).not.toContain('BACKEND_SENSITIVE_DETAIL');
  });

  it('returns committed only after the trust snapshot is written', () => {
    const records = recordExtensionInstallTrust('ext.a', ['workspace.write'], []);
    const writer = vi.fn();

    expect(
      saveExtensionInstallTrustRecordsResult(
        records,
        'workbench-kit/.workbench/extension-install-trust/committed',
        { setItem: writer },
      ),
    ).toEqual({ committed: true });
    expect(writer).toHaveBeenCalledTimes(1);
  });
});
