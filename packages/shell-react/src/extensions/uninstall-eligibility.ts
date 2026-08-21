import type { InstalledExtensionRecord } from '@workbench-kit/workbench-core';

import type { CanonicalExtensionDescriptionSnapshot } from './canonical-extension-descriptions.js';

const BUILTIN_EXTENSION_ID_PREFIX = 'workbench-kit.builtin.' as const;

export type ExtensionUninstallEligibility =
  | {
      readonly kind: 'eligible';
    }
  | {
      readonly diagnosticExtensionIds: readonly string[];
      readonly kind: 'ineligibleTarget';
      readonly reason: 'builtin' | 'notInstalled';
    }
  | {
      readonly dependentExtensionIds: readonly string[];
      readonly kind: 'blocked';
      readonly unresolvedExtensionIds: readonly string[];
    };

export interface ExtensionUninstallEvaluation {
  getEligibility(extensionId: string): ExtensionUninstallEligibility;
}

export function createExtensionUninstallEvaluation({
  canonicalDescriptions,
  installedRecords,
}: {
  readonly canonicalDescriptions: CanonicalExtensionDescriptionSnapshot;
  readonly installedRecords: readonly InstalledExtensionRecord[];
}): ExtensionUninstallEvaluation {
  const installedRecordsById = new Map<string, InstalledExtensionRecord>();
  const duplicateInstalledExtensionIds = new Set<string>();
  for (const record of installedRecords) {
    if (installedRecordsById.has(record.id)) {
      duplicateInstalledExtensionIds.add(record.id);
      continue;
    }
    installedRecordsById.set(record.id, record);
  }

  const dependentsByTargetId = new Map<string, Set<string>>();
  const unresolvedExtensionIdSet = new Set<string>();

  for (const record of installedRecordsById.values()) {
    const description = canonicalDescriptions.getDescription(record.id);
    if (!description || duplicateInstalledExtensionIds.has(record.id)) {
      unresolvedExtensionIdSet.add(record.id);
      continue;
    }

    for (const dependencyId of description.manifest.extensionDependencies ?? []) {
      if (dependencyId === record.id || !installedRecordsById.has(dependencyId)) {
        continue;
      }
      const dependents = dependentsByTargetId.get(dependencyId) ?? new Set<string>();
      dependents.add(record.id);
      dependentsByTargetId.set(dependencyId, dependents);
    }
  }

  const unresolvedExtensionIds = [...unresolvedExtensionIdSet];
  const eligibilityByExtensionId = new Map<string, ExtensionUninstallEligibility>();
  for (const extensionId of installedRecordsById.keys()) {
    if (extensionId.startsWith(BUILTIN_EXTENSION_ID_PREFIX)) {
      eligibilityByExtensionId.set(extensionId, {
        diagnosticExtensionIds: [extensionId],
        kind: 'ineligibleTarget',
        reason: 'builtin',
      });
      continue;
    }

    const dependentExtensionIds = [...(dependentsByTargetId.get(extensionId) ?? [])];
    eligibilityByExtensionId.set(
      extensionId,
      dependentExtensionIds.length === 0 && unresolvedExtensionIds.length === 0
        ? { kind: 'eligible' }
        : {
            dependentExtensionIds,
            kind: 'blocked',
            unresolvedExtensionIds,
          },
    );
  }

  return {
    getEligibility(extensionId) {
      return (
        eligibilityByExtensionId.get(extensionId) ?? {
          diagnosticExtensionIds: [extensionId],
          kind: 'ineligibleTarget',
          reason: 'notInstalled',
        }
      );
    },
  };
}
