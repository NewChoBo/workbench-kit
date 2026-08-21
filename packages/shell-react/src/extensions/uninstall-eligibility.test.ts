import { describe, expect, it } from 'vitest';
import type {
  InstalledExtensionRecord,
  WorkbenchExtensionDescription,
} from '@workbench-kit/workbench-core';

import { createExtensionUninstallEvaluation } from './uninstall-eligibility.js';

const target = extensionDescription('workbench-kit.test.target');

describe('createExtensionUninstallEvaluation', () => {
  it.each([true, false])(
    'blocks a target with a persisted hard dependent when enabled=%s',
    (enabled) => {
      const dependent = extensionDescription('workbench-kit.test.dependent', [target.manifest.id]);
      const evaluation = createExtensionUninstallEvaluation({
        availableExtensions: [target, dependent],
        installedRecords: [installedRecord(target, true), installedRecord(dependent, enabled)],
      });

      expect(evaluation.getEligibility(target.manifest.id)).toEqual({
        dependentExtensionIds: [dependent.manifest.id],
        kind: 'blocked',
        unresolvedExtensionIds: [],
      });
    },
  );

  it('fails closed for missing or ambiguous remaining manifests', () => {
    const missing = installedRecord(extensionDescription('workbench-kit.test.missing'), false);
    const ambiguous = extensionDescription('workbench-kit.test.ambiguous');
    const evaluation = createExtensionUninstallEvaluation({
      availableExtensions: [target, ambiguous, { ...ambiguous }],
      installedRecords: [installedRecord(target, true), missing, installedRecord(ambiguous, true)],
    });

    expect(evaluation.getEligibility(target.manifest.id)).toEqual({
      dependentExtensionIds: [],
      kind: 'blocked',
      unresolvedExtensionIds: ['workbench-kit.test.ambiguous', 'workbench-kit.test.missing'],
    });
  });

  it('keeps safe targets eligible and rejects missing or builtin targets', () => {
    const builtin = extensionDescription('workbench-kit.builtin.test');
    const evaluation = createExtensionUninstallEvaluation({
      availableExtensions: [target, builtin],
      installedRecords: [installedRecord(target, true), installedRecord(builtin, true)],
    });

    expect(evaluation.getEligibility(target.manifest.id)).toEqual({ kind: 'eligible' });
    expect(evaluation.getEligibility(builtin.manifest.id)).toEqual({ kind: 'ineligibleTarget' });
    expect(evaluation.getEligibility('workbench-kit.test.not-installed')).toEqual({
      kind: 'ineligibleTarget',
    });
  });
});

function extensionDescription(
  id: string,
  extensionDependencies?: readonly string[],
): WorkbenchExtensionDescription {
  return {
    manifest: {
      activationEvents: [],
      displayName: id,
      engines: { extensionApi: '^0.0.0', workbench: '^0.0.0' },
      ...(extensionDependencies ? { extensionDependencies: [...extensionDependencies] } : {}),
      id,
      name: id.split('.').pop() ?? id,
      publisher: 'workbench-kit',
      schemaVersion: 1,
      version: '0.0.0',
    },
  };
}

function installedRecord(
  description: WorkbenchExtensionDescription,
  enabled: boolean,
): InstalledExtensionRecord {
  return {
    category: 'utility',
    enabled,
    id: description.manifest.id,
    installedAt: '2026-08-22T00:00:00.000Z',
    manifestUrl: description.manifest.id,
  };
}
