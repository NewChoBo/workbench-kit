import { describe, expect, it } from 'vitest';
import type { WorkbenchExtensionsLock } from '@workbench-kit/workbench-config';

import {
  computeWorkbenchExtensionManifestIntegrity,
  verifyWorkbenchExtensionsAgainstLock,
} from './integrity.js';
import type { WorkbenchExtensionDescription } from './registry.js';

function createExtension(id: string, version = '0.0.0'): WorkbenchExtensionDescription {
  return {
    extensionPath: `extensions/${id}`,
    manifest: {
      activationEvents: ['*'],
      displayName: id,
      engines: { extensionApi: '^0.0.0', workbench: '^0.0.0' },
      id,
      name: id,
      publisher: 'workbench-kit',
      schemaVersion: 1,
      version,
    },
    module: {},
  } as WorkbenchExtensionDescription;
}

describe('verifyWorkbenchExtensionsAgainstLock', () => {
  const extension = createExtension('workbench-kit.samples.demo');
  const integrity = computeWorkbenchExtensionManifestIntegrity(extension.manifest);
  const lock: WorkbenchExtensionsLock = {
    extensions: {
      [extension.manifest.id]: {
        integrity,
        version: '0.0.0',
      },
    },
    lockfileVersion: 1,
  };

  it('accepts matching lock entries in fail-closed mode', () => {
    const result = verifyWorkbenchExtensionsAgainstLock([extension], lock, 'fail-closed');
    expect(result.accepted).toEqual([extension]);
    expect(result.rejected).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects missing lock entries in fail-closed mode', () => {
    const result = verifyWorkbenchExtensionsAgainstLock(
      [extension],
      { extensions: {}, lockfileVersion: 1 },
      'fail-closed',
    );
    expect(result.accepted).toEqual([]);
    expect(result.rejected).toEqual([extension]);
    expect(result.diagnostics[0]?.code).toBe('extension_lock_entry_missing');
  });

  it('keeps mismatched extensions in warn mode', () => {
    const result = verifyWorkbenchExtensionsAgainstLock(
      [extension],
      {
        extensions: {
          [extension.manifest.id]: {
            integrity: 'sha256:deadbeef',
            version: '0.0.0',
          },
        },
        lockfileVersion: 1,
      },
      'warn',
    );
    expect(result.accepted).toEqual([extension]);
    expect(result.diagnostics[0]?.code).toBe('extension_lock_integrity_mismatch');
  });

  it('no-ops when mode is off', () => {
    const result = verifyWorkbenchExtensionsAgainstLock([extension], undefined, 'off');
    expect(result.accepted).toEqual([extension]);
    expect(result.diagnostics).toEqual([]);
  });
});
