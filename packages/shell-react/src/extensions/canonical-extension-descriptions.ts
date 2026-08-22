import {
  computeWorkbenchExtensionManifestIntegrity,
  type WorkbenchExtensionDescription,
} from '@workbench-kit/workbench-core';

export interface CanonicalExtensionDescriptionSnapshot {
  readonly ambiguousExtensionIds: readonly string[];
  readonly descriptions: readonly WorkbenchExtensionDescription[];
  getDescription(extensionId: string): WorkbenchExtensionDescription | undefined;
}

export function createCanonicalExtensionDescriptionSnapshot({
  availableExtensions,
  liveExtensions,
}: {
  readonly availableExtensions: readonly WorkbenchExtensionDescription[];
  readonly liveExtensions: readonly WorkbenchExtensionDescription[];
}): CanonicalExtensionDescriptionSnapshot {
  const descriptionsById = new Map<string, WorkbenchExtensionDescription>();
  const ambiguousExtensionIds = new Set<string>();

  for (const description of [...availableExtensions, ...liveExtensions]) {
    const extensionId = description.manifest.id;
    const existing = descriptionsById.get(extensionId);
    if (!existing) {
      descriptionsById.set(extensionId, description);
      continue;
    }
    if (!areEquivalentDescriptions(existing, description)) {
      ambiguousExtensionIds.add(extensionId);
    }
  }

  const descriptions = [...descriptionsById.values()].sort((left, right) =>
    left.manifest.id.localeCompare(right.manifest.id),
  );
  const ambiguousIds = [...ambiguousExtensionIds].sort((left, right) => left.localeCompare(right));

  return {
    ambiguousExtensionIds: ambiguousIds,
    descriptions,
    getDescription(extensionId) {
      return ambiguousExtensionIds.has(extensionId) ? undefined : descriptionsById.get(extensionId);
    },
  };
}

function areEquivalentDescriptions(
  left: WorkbenchExtensionDescription,
  right: WorkbenchExtensionDescription,
): boolean {
  return (
    left.extensionPath === right.extensionPath &&
    left.module === right.module &&
    computeWorkbenchExtensionManifestIntegrity(left.manifest) ===
      computeWorkbenchExtensionManifestIntegrity(right.manifest)
  );
}
