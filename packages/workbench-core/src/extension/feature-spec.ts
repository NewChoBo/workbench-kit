import type {
  ConfigurationContribution,
  EditorDocumentViewContribution,
  ExtensionFeatureSpec,
  ExtensionSettingFeatureSpec,
  WorkbenchExtensionManifest,
} from '@workbench-kit/workbench-extension-sdk';

import {
  normalizeMenuContributions,
  normalizeViewContainers,
  normalizeViews,
} from './contribution-normalizers.js';

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
    menus: normalizeMenuContributions(contributes?.menus),
    name: manifest.name,
    panels: [...(contributes?.panels ?? [])],
    permissions: [...(manifest.permissions ?? [])],
    publisher: manifest.publisher,
    settings: normalizeSettingFeatureSpecs(contributes?.configuration),
    statusBar: [...(contributes?.statusBar ?? [])],
    themes: [...(contributes?.themes ?? [])],
    version: manifest.version,
    viewContainers: normalizeViewContainers(contributes?.viewContainers),
    views: normalizeViews(contributes?.views),
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
