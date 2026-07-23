import type {
  ConfigurationContribution,
  EditorDocumentViewContribution,
  ExtensionFeatureSpec,
  ExtensionSettingFeatureSpec,
  ExtensionViewContainerFeatureSpec,
  ExtensionViewFeatureSpec,
  MenuContribution,
  ViewContainerContribution,
  ViewContribution,
  WorkbenchExtensionManifest,
} from '@workbench-kit/workbench-extension-sdk';

export interface WorkbenchExtensionFeatureDescription {
  readonly extensionPath?: string | undefined;
  readonly manifest: WorkbenchExtensionManifest;
}

export function createExtensionFeatureSpec(
  description: WorkbenchExtensionFeatureDescription,
): ExtensionFeatureSpec {
  const { manifest } = description;
  const contributes = manifest.contributes;

  return {
    activationEvents: [...manifest.activationEvents],
    activities: [...(contributes?.activities ?? [])],
    capabilities: {
      provides: [...(manifest.capabilities?.provides ?? [])],
      requires: [...(manifest.capabilities?.requires ?? [])],
    },
    commands: (contributes?.commands ?? []).map((command) => ({
      ...command,
      id: command.command,
    })),
    dependencies: {
      extensionDependencies: [...(manifest.extensionDependencies ?? [])],
      extensionOptionalDependencies: [...(manifest.extensionOptionalDependencies ?? [])],
      extensionPack: [...(manifest.extensionPack ?? [])],
    },
    displayName: manifest.displayName,
    documentViews: normalizeDocumentViewFeatureSpecs(contributes?.documentViews),
    editors: [...(contributes?.editors ?? [])],
    engines: {
      extensionApi: manifest.engines.extensionApi,
      workbench: manifest.engines.workbench,
    },
    extensionPath: description.extensionPath,
    id: manifest.id,
    keybindings: [...(contributes?.keybindings ?? [])],
    localizations: [...(contributes?.localizations ?? [])],
    menus: normalizeMenuFeatureSpecs(contributes?.menus),
    name: manifest.name,
    permissions: [...(manifest.permissions ?? [])],
    publisher: manifest.publisher,
    settings: normalizeSettingFeatureSpecs(contributes?.configuration),
    themes: [...(contributes?.themes ?? [])],
    version: manifest.version,
    viewContainers: normalizeViewContainerFeatureSpecs(contributes?.viewContainers),
    views: normalizeViewFeatureSpecs(contributes?.views),
  };
}

export function createExtensionFeatureSpecs(
  descriptions: readonly WorkbenchExtensionFeatureDescription[],
): readonly ExtensionFeatureSpec[] {
  return descriptions.map((description) => createExtensionFeatureSpec(description));
}

function normalizeDocumentViewFeatureSpecs(
  value: readonly EditorDocumentViewContribution[] | undefined,
): EditorDocumentViewContribution[] {
  return [...(value ?? [])];
}

function normalizeSettingFeatureSpecs(
  configuration: ConfigurationContribution | undefined,
): ExtensionSettingFeatureSpec[] {
  return Object.entries(configuration?.properties ?? {}).map(([key, property]) => ({
    ...property,
    key,
  }));
}

function normalizeMenuFeatureSpecs(value: unknown): MenuContribution[] {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value as MenuContribution[];
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([menu, entries]) => {
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries.map((entry) => ({ ...(entry as object), menu }) as MenuContribution);
  });
}

function normalizeViewContainerFeatureSpecs(value: unknown): ExtensionViewContainerFeatureSpec[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([location, containers]) => {
    if (!Array.isArray(containers)) {
      return [];
    }

    return containers.map((container) => ({
      ...(container as ViewContainerContribution),
      location,
    }));
  });
}

function normalizeViewFeatureSpecs(value: unknown): ExtensionViewFeatureSpec[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([containerId, views]) => {
    if (!Array.isArray(views)) {
      return [];
    }

    return views.map((view) => {
      const partialView = view as ViewContribution;
      return {
        ...partialView,
        containerId: partialView.containerId ?? containerId,
      };
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
