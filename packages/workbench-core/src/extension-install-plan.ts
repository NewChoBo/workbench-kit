import type { WorkbenchExtensionManifest } from '@workbench-kit/workbench-extension-sdk';

import type { InstalledExtensionRecord } from './extension-install-state.js';
import {
  collectExtensionDependencyDiagnostics,
  type ExtensionDependencyDiagnostic,
  type ExtensionDependencyDiagnosticKind,
  type ExtensionDependencyDiagnosticSeverity,
  type WorkbenchExtensionDescription,
} from './extension-registry.js';

export type ExtensionInstallPlanReason = 'dependency' | 'extension-pack' | 'target';

export type ExtensionInstallPlanActionKind = 'already-enabled' | 'enable' | 'install';

export type ExtensionInstallPlanDiagnosticKind =
  | ExtensionDependencyDiagnosticKind
  | 'dependency-cycle'
  | 'install-source-not-found'
  | 'missing-extension-pack'
  | 'target-extension-not-found';

export interface ExtensionInstallPlanDiagnostic extends Omit<
  ExtensionDependencyDiagnostic,
  'kind' | 'severity'
> {
  readonly cycle?: readonly string[] | undefined;
  readonly kind: ExtensionInstallPlanDiagnosticKind;
  readonly severity: ExtensionDependencyDiagnosticSeverity;
}

export interface ExtensionInstallPlanAction {
  readonly extensionId: string;
  readonly kind: ExtensionInstallPlanActionKind;
  readonly reason: ExtensionInstallPlanReason;
}

export interface ExtensionInstallPlanInstallSource {
  readonly category: string;
  readonly id: string;
  readonly manifestUrl: string;
}

export interface ExtensionInstallPlanCapabilitySummary {
  readonly provides: readonly string[];
  readonly requires: readonly string[];
}

export interface CreateExtensionInstallPlanInput {
  readonly availableExtensions: readonly WorkbenchExtensionDescription[];
  readonly enabledExtensionIds?: readonly string[] | undefined;
  readonly hostCapabilityIds?: readonly string[] | undefined;
  readonly installSources?: readonly ExtensionInstallPlanInstallSource[] | undefined;
  readonly installedRecords?: readonly InstalledExtensionRecord[] | undefined;
  readonly targetExtensionId: string;
}

export interface ExtensionInstallPlan {
  readonly actions: readonly ExtensionInstallPlanAction[];
  readonly alreadyEnabledExtensionIds: readonly string[];
  readonly blocked: boolean;
  readonly capabilities: ExtensionInstallPlanCapabilitySummary;
  readonly dependencyExtensionIds: readonly string[];
  readonly diagnostics: readonly ExtensionInstallPlanDiagnostic[];
  readonly enableExtensionIds: readonly string[];
  readonly extensionPackIds: readonly string[];
  readonly installExtensionIds: readonly string[];
  readonly permissions: readonly string[];
  readonly requiresApproval: boolean;
  readonly targetExtensionId: string;
}

export function createExtensionInstallPlan({
  availableExtensions,
  enabledExtensionIds,
  hostCapabilityIds = [],
  installSources,
  installedRecords = [],
  targetExtensionId,
}: CreateExtensionInstallPlanInput): ExtensionInstallPlan {
  const availableById = new Map(
    availableExtensions.map((extension) => [extension.manifest.id, extension]),
  );
  const installedIds = new Set(installedRecords.map((record) => record.id));
  const enabledIds = new Set(
    enabledExtensionIds ??
      installedRecords.filter((record) => record.enabled).map((record) => record.id),
  );
  const diagnostics: ExtensionInstallPlanDiagnostic[] = [];
  const installSourcesById =
    installSources !== undefined
      ? new Map(installSources.map((source) => [source.id, source]))
      : undefined;
  const reasonById = new Map<string, ExtensionInstallPlanReason>();
  const orderedIds: string[] = [];
  const visitedIds = new Set<string>();
  const dependencyExtensionIds = new Set<string>();
  const extensionPackIds = new Set<string>();

  visitExtension(targetExtensionId, 'target', []);

  const plannedIds = new Set(orderedIds);
  const descriptionsForDiagnostics = [...new Set([...enabledIds, ...plannedIds])]
    .map((extensionId) => availableById.get(extensionId))
    .filter(
      (description): description is WorkbenchExtensionDescription => description !== undefined,
    );
  diagnostics.push(
    ...collectExtensionDependencyDiagnostics(descriptionsForDiagnostics, {
      hasCapability: (capabilityId) => hostCapabilityIds.includes(capabilityId),
    }).filter((diagnostic) => isInstallPlanDiagnosticRelevant(diagnostic, plannedIds)),
  );

  const actions = orderedIds.map<ExtensionInstallPlanAction>((extensionId) => {
    const reason = reasonById.get(extensionId) ?? 'dependency';
    if (enabledIds.has(extensionId)) {
      return { extensionId, kind: 'already-enabled', reason };
    }

    if (installedIds.has(extensionId)) {
      return { extensionId, kind: 'enable', reason };
    }

    return { extensionId, kind: 'install', reason };
  });
  if (installSourcesById) {
    for (const action of actions) {
      if (action.kind !== 'install' || installSourcesById.has(action.extensionId)) {
        continue;
      }

      diagnostics.push({
        dependencyId: action.extensionId,
        extensionId: action.extensionId,
        kind: 'install-source-not-found',
        message: `Extension "${action.extensionId}" is planned for install but has no catalog install source.`,
        severity: 'error',
      });
    }
  }
  const newExtensionIds = actions
    .filter((action) => action.kind !== 'already-enabled')
    .map((action) => action.extensionId);
  const newManifests = newExtensionIds
    .map((extensionId) => availableById.get(extensionId)?.manifest)
    .filter((manifest): manifest is WorkbenchExtensionManifest => manifest !== undefined);
  const permissions = uniqueSorted(newManifests.flatMap((manifest) => manifest.permissions ?? []));
  const capabilities = {
    provides: uniqueSorted(
      newManifests.flatMap((manifest) => manifest.capabilities?.provides ?? []),
    ),
    requires: uniqueSorted(
      newManifests.flatMap((manifest) => manifest.capabilities?.requires ?? []),
    ),
  };
  const planDiagnostics = uniqueInstallPlanDiagnostics(diagnostics);

  return {
    actions,
    alreadyEnabledExtensionIds: actions
      .filter((action) => action.kind === 'already-enabled')
      .map((action) => action.extensionId),
    blocked: planDiagnostics.some((diagnostic) => diagnostic.severity === 'error'),
    capabilities,
    dependencyExtensionIds: [...dependencyExtensionIds],
    diagnostics: planDiagnostics,
    enableExtensionIds: actions
      .filter((action) => action.kind === 'enable')
      .map((action) => action.extensionId),
    extensionPackIds: [...extensionPackIds],
    installExtensionIds: actions
      .filter((action) => action.kind === 'install')
      .map((action) => action.extensionId),
    permissions,
    requiresApproval: permissions.length > 0,
    targetExtensionId,
  };

  function visitExtension(
    extensionId: string,
    reason: ExtensionInstallPlanReason,
    path: readonly string[],
  ): void {
    const existingPathIndex = path.indexOf(extensionId);
    if (existingPathIndex >= 0) {
      const cycle = [...path.slice(existingPathIndex), extensionId];
      diagnostics.push({
        cycle,
        extensionId,
        kind: 'dependency-cycle',
        message: `Extension dependency cycle detected: ${cycle.join(' -> ')}.`,
        severity: 'error',
      });
      return;
    }

    const description = availableById.get(extensionId);
    if (!description) {
      diagnostics.push(createMissingDiagnostic(extensionId, reason, path[path.length - 1]));
      return;
    }

    if (reason === 'dependency') {
      dependencyExtensionIds.add(extensionId);
    } else if (reason === 'extension-pack') {
      extensionPackIds.add(extensionId);
    }

    setPlanReason(extensionId, reason, reasonById);

    const manifest = description.manifest;
    for (const dependencyId of manifest.extensionDependencies ?? []) {
      visitExtension(dependencyId, 'dependency', [...path, extensionId]);
    }

    for (const packExtensionId of manifest.extensionPack ?? []) {
      visitExtension(packExtensionId, 'extension-pack', [...path, extensionId]);
    }

    if (visitedIds.has(extensionId)) {
      return;
    }

    visitedIds.add(extensionId);
    orderedIds.push(extensionId);
  }
}

function setPlanReason(
  extensionId: string,
  reason: ExtensionInstallPlanReason,
  reasonById: Map<string, ExtensionInstallPlanReason>,
): void {
  const currentReason = reasonById.get(extensionId);
  if (!currentReason || installPlanReasonRank(reason) < installPlanReasonRank(currentReason)) {
    reasonById.set(extensionId, reason);
  }
}

function installPlanReasonRank(reason: ExtensionInstallPlanReason): number {
  if (reason === 'target') return 0;
  if (reason === 'dependency') return 1;
  return 2;
}

function uniqueInstallPlanDiagnostics(
  diagnostics: readonly ExtensionInstallPlanDiagnostic[],
): readonly ExtensionInstallPlanDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = [
      diagnostic.kind,
      diagnostic.extensionId,
      diagnostic.dependencyId,
      diagnostic.capabilityId,
      diagnostic.commandId,
      diagnostic.cycle?.join(' -> '),
    ].join('\u0000');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function isInstallPlanDiagnosticRelevant(
  diagnostic: ExtensionDependencyDiagnostic,
  plannedIds: ReadonlySet<string>,
): boolean {
  if (plannedIds.has(diagnostic.extensionId)) {
    return true;
  }

  if (diagnostic.dependencyId && plannedIds.has(diagnostic.dependencyId)) {
    return true;
  }

  return (
    diagnostic.providerExtensionIds?.some((extensionId) => plannedIds.has(extensionId)) ?? false
  );
}

function createMissingDiagnostic(
  extensionId: string,
  reason: ExtensionInstallPlanReason,
  dependentExtensionId: string | undefined,
): ExtensionInstallPlanDiagnostic {
  if (reason === 'target') {
    return {
      dependencyId: extensionId,
      extensionId,
      kind: 'target-extension-not-found',
      message: `Extension "${extensionId}" is not available in the install catalog.`,
      severity: 'error',
    };
  }

  if (reason === 'extension-pack') {
    return {
      dependencyId: extensionId,
      extensionId: dependentExtensionId ?? extensionId,
      kind: 'missing-extension-pack',
      message: `Extension pack member "${extensionId}" is not available.`,
      severity: 'error',
    };
  }

  return {
    dependencyId: extensionId,
    extensionId: dependentExtensionId ?? extensionId,
    kind: 'missing-extension-dependency',
    message: `Extension "${dependentExtensionId ?? extensionId}" depends on missing extension "${extensionId}".`,
    severity: 'error',
  };
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
