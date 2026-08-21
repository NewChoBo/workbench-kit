import type {
  InstalledExtensionRecord,
  WorkbenchExtensionDescription,
} from '@workbench-kit/workbench-core';

const BUILTIN_EXTENSION_ID_PREFIX = 'workbench-kit.builtin.' as const;

export type ExtensionUninstallEligibility =
  | {
      readonly kind: 'eligible';
    }
  | {
      readonly kind: 'ineligibleTarget';
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
  availableExtensions,
  installedRecords,
}: {
  readonly availableExtensions: readonly WorkbenchExtensionDescription[];
  readonly installedRecords: readonly InstalledExtensionRecord[];
}): ExtensionUninstallEvaluation {
  const installedExtensionIds = new Set(installedRecords.map((record) => record.id));
  const availableExtensionsById = indexAvailableExtensions(availableExtensions);
  const dependentsByTargetId = new Map<string, Set<string>>();
  const unresolvedExtensionIds = new Set<string>();

  for (const record of installedRecords) {
    const description = availableExtensionsById.get(record.id);
    if (!description) {
      unresolvedExtensionIds.add(record.id);
      continue;
    }

    for (const dependencyId of description.manifest.extensionDependencies ?? []) {
      if (dependencyId === record.id || !installedExtensionIds.has(dependencyId)) {
        continue;
      }
      const dependents = dependentsByTargetId.get(dependencyId) ?? new Set<string>();
      dependents.add(record.id);
      dependentsByTargetId.set(dependencyId, dependents);
    }
  }

  return {
    getEligibility(extensionId) {
      if (
        !installedExtensionIds.has(extensionId) ||
        extensionId.startsWith(BUILTIN_EXTENSION_ID_PREFIX)
      ) {
        return { kind: 'ineligibleTarget' };
      }

      const dependentExtensionIds = [...(dependentsByTargetId.get(extensionId) ?? [])].sort();
      const unresolvedRemainingExtensionIds = [...unresolvedExtensionIds]
        .filter((candidateId) => candidateId !== extensionId)
        .sort();
      if (dependentExtensionIds.length === 0 && unresolvedRemainingExtensionIds.length === 0) {
        return { kind: 'eligible' };
      }

      return {
        dependentExtensionIds,
        kind: 'blocked',
        unresolvedExtensionIds: unresolvedRemainingExtensionIds,
      };
    },
  };
}

function indexAvailableExtensions(
  availableExtensions: readonly WorkbenchExtensionDescription[],
): ReadonlyMap<string, WorkbenchExtensionDescription | undefined> {
  const byId = new Map<string, WorkbenchExtensionDescription | undefined>();
  for (const description of availableExtensions) {
    const extensionId = description.manifest.id;
    if (byId.has(extensionId)) {
      byId.set(extensionId, undefined);
      continue;
    }
    byId.set(extensionId, description);
  }
  return byId;
}
