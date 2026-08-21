import { describe, expect, it } from 'vitest';
import type {
  InstalledExtensionRecord,
  WorkbenchExtensionDescription,
} from '@workbench-kit/workbench-core';

import { createExtensionUninstallEvaluation } from './uninstall-eligibility.js';
import { createCanonicalExtensionDescriptionSnapshot } from './canonical-extension-descriptions.js';

const target = extensionDescription('workbench-kit.test.target');

describe('createExtensionUninstallEvaluation', () => {
  it.each([true, false])(
    'blocks a target with a persisted hard dependent when enabled=%s',
    (enabled) => {
      const laterDependent = extensionDescription('workbench-kit.test.z-dependent', [
        target.manifest.id,
      ]);
      const earlierDependent = extensionDescription('workbench-kit.test.a-dependent', [
        target.manifest.id,
      ]);
      const evaluation = createExtensionUninstallEvaluation({
        canonicalDescriptions: canonical([target, laterDependent, earlierDependent]),
        installedRecords: [
          installedRecord(target, true),
          installedRecord(laterDependent, enabled),
          installedRecord(earlierDependent, enabled),
        ],
      });

      expect(evaluation.getEligibility(target.manifest.id)).toEqual({
        dependentExtensionIds: [earlierDependent.manifest.id, laterDependent.manifest.id],
        kind: 'blocked',
        unresolvedExtensionIds: [],
      });
    },
  );

  it('fails closed for missing or ambiguous remaining manifests', () => {
    const missing = installedRecord(extensionDescription('workbench-kit.test.missing'), false);
    const ambiguous = extensionDescription('workbench-kit.test.ambiguous');
    const conflictingAmbiguous = {
      ...ambiguous,
      manifest: { ...ambiguous.manifest, displayName: 'Conflicting Ambiguous Extension' },
    };
    const evaluation = createExtensionUninstallEvaluation({
      canonicalDescriptions: canonical([target, ambiguous], [conflictingAmbiguous]),
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
      canonicalDescriptions: canonical([target, builtin]),
      installedRecords: [installedRecord(target, true), installedRecord(builtin, true)],
    });

    expect(evaluation.getEligibility(target.manifest.id)).toEqual({ kind: 'eligible' });
    expect(evaluation.getEligibility(builtin.manifest.id)).toEqual({
      diagnosticExtensionIds: [builtin.manifest.id],
      kind: 'ineligibleTarget',
      reason: 'builtin',
    });
    expect(evaluation.getEligibility('workbench-kit.test.not-installed')).toEqual({
      diagnosticExtensionIds: ['workbench-kit.test.not-installed'],
      kind: 'ineligibleTarget',
      reason: 'notInstalled',
    });
  });

  it('precomputes dependency reads and returns the same per-target result', () => {
    let dependencyReads = 0;
    const dependent = extensionDescription('workbench-kit.test.dependent');
    Object.defineProperty(dependent.manifest, 'extensionDependencies', {
      configurable: true,
      get: () => {
        dependencyReads += 1;
        return [target.manifest.id];
      },
    });
    const evaluation = createExtensionUninstallEvaluation({
      canonicalDescriptions: canonical([target, dependent]),
      installedRecords: [installedRecord(target, true), installedRecord(dependent, false)],
    });

    const first = evaluation.getEligibility(target.manifest.id);
    const second = evaluation.getEligibility(target.manifest.id);

    expect(first).toBe(second);
    expect(dependencyReads).toBe(1);
  });
});

function canonical(
  availableExtensions: readonly WorkbenchExtensionDescription[],
  liveExtensions: readonly WorkbenchExtensionDescription[] = [],
) {
  return createCanonicalExtensionDescriptionSnapshot({ availableExtensions, liveExtensions });
}

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
