import {
  BUILTIN_WORKBENCH_EXTENSIONS,
  SAMPLE_WORKBENCH_EXTENSIONS,
  createExtensionFeatureSpec,
  createExtensionInstallPlan,
  resolveBundledExtensionByManifestUrl,
  type ExtensionCatalogEntry,
  type ExtensionFeatureInspection,
  type ExtensionFeatureSpec,
  type ExtensionInstallPlan,
  type ExtensionInstallPlanInstallSource,
  type ExtensionRegistry,
  type InstalledExtensionRecord,
  type WorkbenchExtensionDescription,
} from '@workbench-kit/workbench-core';
import type {
  ExtensionCatalogBrowseEntry,
  ExtensionManagementDiagnosticSummary,
  ExtensionManagementEntry,
  ExtensionManagementFeatureSummary,
} from '@workbench-kit/react/workbench/management';

export const BUNDLED_EXTENSIONS = [
  ...BUILTIN_WORKBENCH_EXTENSIONS,
  ...SAMPLE_WORKBENCH_EXTENSIONS,
] as const;

export interface CreateExtensionManagementEntriesInput {
  readonly extensionRegistry: ExtensionRegistry;
  readonly installedRecords: readonly InstalledExtensionRecord[];
}

export interface CreateExtensionCatalogBrowseEntriesInput extends CreateExtensionManagementEntriesInput {
  readonly catalogEntries: readonly ExtensionCatalogEntry[];
}

export interface ExtensionInstallPlanningContext extends CreateExtensionManagementEntriesInput {
  readonly availableExtensions: readonly WorkbenchExtensionDescription[];
  readonly enabledExtensionIds: readonly string[];
  readonly hostCapabilityIds: readonly string[];
  readonly installSources: readonly ExtensionInstallPlanInstallSource[];
}

export function createExtensionManagementEntries({
  extensionRegistry,
  installedRecords,
}: CreateExtensionManagementEntriesInput): readonly ExtensionManagementEntry[] {
  const installedById = new Map(installedRecords.map((record) => [record.id, record]));
  const extensionFeatures = createExtensionManagementFeatureMaps(extensionRegistry);
  const bundledEntries = BUNDLED_EXTENSIONS.map((extension) => {
    const installed = installedById.get(extension.manifest.id);
    const isBuiltin = extension.manifest.id.startsWith('workbench-kit.builtin.');
    const featureState = resolveExtensionManagementFeatureState(
      extension.manifest.id,
      extensionFeatures,
    );

    return {
      category: installed?.category ?? (isBuiltin ? 'builtin' : 'sample'),
      description: extension.manifest.displayName,
      diagnostics: featureState.diagnostics,
      displayName: extension.manifest.displayName,
      enabled: isBuiltin ? true : (installed?.enabled ?? false),
      features: featureState.features,
      id: extension.manifest.id,
      installedAt: installed?.installedAt,
      manifestUrl: installed?.manifestUrl,
      source: isBuiltin ? ('bundled' as const) : ('installed' as const),
    } satisfies ExtensionManagementEntry;
  }).filter((entry) => entry.source === 'bundled' || installedById.has(entry.id));

  const activeExtensions = extensionRegistry
    .getExtensions()
    .filter(
      (extension) =>
        !BUNDLED_EXTENSIONS.some((bundled) => bundled.manifest.id === extension.manifest.id),
    )
    .map((extension) => {
      const installed = installedById.get(extension.manifest.id);
      const featureState = resolveExtensionManagementFeatureState(
        extension.manifest.id,
        extensionFeatures,
      );

      return {
        category: installed?.category ?? 'installed',
        description: extension.manifest.displayName,
        diagnostics: featureState.diagnostics,
        displayName: extension.manifest.displayName,
        enabled: installed?.enabled ?? true,
        features: featureState.features,
        id: extension.manifest.id,
        installedAt: installed?.installedAt,
        manifestUrl: installed?.manifestUrl,
        source: 'installed',
      } satisfies ExtensionManagementEntry;
    });

  return [...bundledEntries, ...activeExtensions].sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
}

export function createExtensionCatalogBrowseEntries({
  catalogEntries,
  extensionRegistry,
  installedRecords,
}: CreateExtensionCatalogBrowseEntriesInput): readonly ExtensionCatalogBrowseEntry[] {
  const installedIds = new Set(installedRecords.map((record) => record.id));
  const installContext = createExtensionInstallPlanningContext({
    catalogEntries,
    extensionRegistry,
    installedRecords,
  });

  return catalogEntries.map((entry) => {
    const bundledExtension = resolveBundledExtensionByManifestUrl(
      entry.manifestUrl,
      installContext.availableExtensions,
    );
    const extensionId = bundledExtension?.manifest.id ?? entry.id;
    const plan = createCatalogEntryInstallPlan(entry, installContext);

    return {
      category: entry.category,
      description: entry.description,
      displayName: entry.displayName,
      icon: entry.icon,
      id: extensionId,
      installPlan: plan ? toExtensionInstallPlanSummary(plan) : undefined,
      installed: installedIds.has(extensionId),
      manifestUrl: entry.manifestUrl,
    };
  });
}

export function createExtensionInstallPlanningContext({
  catalogEntries,
  extensionRegistry,
  installedRecords,
}: CreateExtensionCatalogBrowseEntriesInput): ExtensionInstallPlanningContext {
  const availableExtensions = mergeUniqueExtensionDescriptions([
    ...BUNDLED_EXTENSIONS,
    ...extensionRegistry.getExtensions(),
  ]);

  return {
    availableExtensions,
    enabledExtensionIds: extensionRegistry
      .getExtensions()
      .map((extension) => extension.manifest.id),
    extensionRegistry,
    hostCapabilityIds: extensionRegistry.capabilityRegistry.listProviderIds(),
    installSources: createExtensionInstallSources(catalogEntries, availableExtensions),
    installedRecords,
  };
}

export function createCatalogEntryInstallPlan(
  entry: Pick<ExtensionCatalogBrowseEntry, 'manifestUrl'>,
  {
    availableExtensions,
    enabledExtensionIds,
    hostCapabilityIds,
    installedRecords,
    installSources,
  }: ExtensionInstallPlanningContext,
): ExtensionInstallPlan | undefined {
  const bundledExtension = resolveBundledExtensionByManifestUrl(
    entry.manifestUrl,
    availableExtensions,
  );
  if (!bundledExtension) {
    return undefined;
  }

  return createExtensionInstallPlan({
    availableExtensions,
    enabledExtensionIds,
    hostCapabilityIds,
    installSources,
    installedRecords,
    targetExtensionId: bundledExtension.manifest.id,
  });
}

function createExtensionInstallSources(
  catalogEntries: readonly ExtensionCatalogEntry[],
  availableExtensions: readonly WorkbenchExtensionDescription[],
): readonly ExtensionInstallPlanInstallSource[] {
  const byId = new Map<string, ExtensionInstallPlanInstallSource>();
  for (const entry of catalogEntries) {
    const bundledExtension = resolveBundledExtensionByManifestUrl(
      entry.manifestUrl,
      availableExtensions,
    );
    const extensionId = bundledExtension?.manifest.id ?? entry.id;
    byId.set(extensionId, {
      category: entry.category,
      id: extensionId,
      manifestUrl: entry.manifestUrl,
    });
  }

  return [...byId.values()];
}

function mergeUniqueExtensionDescriptions(
  descriptions: readonly WorkbenchExtensionDescription[],
): readonly WorkbenchExtensionDescription[] {
  const byId = new Map<string, WorkbenchExtensionDescription>();
  for (const description of descriptions) {
    byId.set(description.manifest.id, description);
  }
  return [...byId.values()];
}

function createExtensionManagementFeatureMaps(extensionRegistry: ExtensionRegistry) {
  return {
    bundledFeaturesById: new Map(
      BUNDLED_EXTENSIONS.map((extension) => [
        extension.manifest.id,
        createExtensionFeatureSpec(extension),
      ]),
    ),
    inspectionsById: new Map(
      extensionRegistry
        .getFeatureInspections()
        .map((inspection) => [inspection.feature.id, inspection]),
    ),
  };
}

function resolveExtensionManagementFeatureState(
  extensionId: string,
  {
    bundledFeaturesById,
    inspectionsById,
  }: {
    bundledFeaturesById: ReadonlyMap<string, ExtensionFeatureSpec>;
    inspectionsById: ReadonlyMap<string, ExtensionFeatureInspection>;
  },
): {
  readonly diagnostics?: readonly ExtensionManagementDiagnosticSummary[] | undefined;
  readonly features?: ExtensionManagementFeatureSummary | undefined;
} {
  const inspection = inspectionsById.get(extensionId);
  const feature = inspection?.feature ?? bundledFeaturesById.get(extensionId);

  return {
    diagnostics: inspection?.diagnostics.map(({ message, severity }) => ({ message, severity })),
    features: feature ? toExtensionManagementFeatureSummary(feature) : undefined,
  };
}

function toExtensionManagementFeatureSummary(
  feature: ExtensionFeatureSpec,
): ExtensionManagementFeatureSummary {
  const commandTitlesById = new Map(feature.commands.map((command) => [command.id, command.title]));

  return {
    capabilities: feature.capabilities,
    commands: feature.commands.map((command) => ({
      description: command.description,
      id: command.id,
      label: command.title,
    })),
    documentViews: feature.documentViews.map((view) => ({
      id: view.id,
      label: view.label,
    })),
    menus: feature.menus.map((menu) => ({
      description: formatMenuContributionDescription(menu.group, menu.order),
      id: `${menu.menu}:${menu.command}`,
      label: `${menu.menu}: ${commandTitlesById.get(menu.command) ?? menu.command}`,
    })),
    permissions: feature.permissions,
    settings: feature.settings.map((setting) => ({
      description: setting.description,
      id: setting.key,
      label: setting.key,
    })),
    views: feature.views.map((view) => ({
      id: view.id,
      label: view.name,
    })),
  };
}

function toExtensionInstallPlanSummary(
  plan: ExtensionInstallPlan,
): ExtensionCatalogBrowseEntry['installPlan'] {
  return {
    blocked: plan.blocked,
    diagnostics: plan.diagnostics.map(({ message, severity }) => ({ message, severity })),
    enableExtensionIds: plan.enableExtensionIds,
    installExtensionIds: plan.installExtensionIds,
    permissions: plan.permissions,
    requiresApproval: plan.requiresApproval,
  };
}

function formatMenuContributionDescription(
  group: string | undefined,
  order: number | undefined,
): string | undefined {
  const parts = [
    group ? `group: ${group}` : undefined,
    order !== undefined ? `order: ${order}` : undefined,
  ].filter((part): part is string => part !== undefined);

  return parts.length > 0 ? parts.join(', ') : undefined;
}
