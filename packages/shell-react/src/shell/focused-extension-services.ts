import {
  WORKBENCH_SETTINGS_CAPABILITY_ID,
  type ExtensionDependencyDiagnostic,
  type ExtensionFeatureInspection,
  type ExtensionFeatureSpec,
  type WorkbenchExtensionDescription,
  type WorkbenchSettingsCapability,
} from '@workbench-kit/workbench-core';

interface DisposableLike {
  dispose(): void;
}

interface ExtensionActivationRegistry {
  activateView(viewId: string): Promise<readonly { readonly extensionId: string }[]>;
  getActiveExtensions(): readonly { readonly extensionId: string }[];
  onDidActivateExtension(listener: () => void): DisposableLike;
  onDidDeactivateExtension(listener: () => void): DisposableLike;
}

interface ExtensionCatalogRegistry {
  readonly capabilityRegistry: {
    listProviderIds(): readonly string[];
  };
  getDependencyDiagnostics(): readonly ExtensionDependencyDiagnostic[];
  getExtension(extensionId: string): WorkbenchExtensionDescription | undefined;
  getExtensions(): readonly WorkbenchExtensionDescription[];
  getFeatureInspections(): readonly ExtensionFeatureInspection[];
  getFeatureSpecs(): readonly ExtensionFeatureSpec[];
}

interface SettingsCapabilityRegistry {
  has(capabilityId: string): boolean;
  register(registration: {
    readonly get: () => WorkbenchSettingsCapability;
    readonly id: string;
  }): DisposableLike;
}

export interface WorkbenchExtensionActivationAccess {
  activateView(viewId: string): Promise<readonly { readonly extensionId: string }[]>;
  onDidActivateExtension(listener: () => void): DisposableLike;
  waitForStartup(): Promise<void>;
}

export interface WorkbenchExtensionActivationStateReader {
  getActiveExtensions(): readonly { readonly extensionId: string }[];
  onDidChangeActiveExtensions(listener: () => void): DisposableLike;
}

export interface WorkbenchExtensionCatalogReader {
  getDependencyDiagnostics(): readonly ExtensionDependencyDiagnostic[];
  getExtension(extensionId: string): WorkbenchExtensionDescription | undefined;
  getExtensions(): readonly WorkbenchExtensionDescription[];
  getFeatureInspections(): readonly ExtensionFeatureInspection[];
  getFeatureSpecs(): readonly ExtensionFeatureSpec[];
  listCapabilityProviderIds(): readonly string[];
}

export type WorkbenchSettingsCapabilityPublication =
  | { readonly kind: 'already-registered' }
  | { readonly disposable: DisposableLike; readonly kind: 'registered' };

export interface WorkbenchSettingsCapabilityPublisher {
  publishSettingsCapability(
    capability: WorkbenchSettingsCapability,
  ): WorkbenchSettingsCapabilityPublication;
}

export function createWorkbenchExtensionActivationAccess(
  registry: ExtensionActivationRegistry,
  waitForStartup: () => Promise<void>,
): WorkbenchExtensionActivationAccess {
  return {
    activateView: (viewId) => registry.activateView(viewId),
    onDidActivateExtension: (listener) => registry.onDidActivateExtension(listener),
    waitForStartup,
  };
}

export function createWorkbenchExtensionActivationStateReader(
  registry: ExtensionActivationRegistry,
): WorkbenchExtensionActivationStateReader {
  return {
    getActiveExtensions: () =>
      registry.getActiveExtensions().map(({ extensionId }) => ({ extensionId })),
    onDidChangeActiveExtensions: (listener) => {
      const activation = registry.onDidActivateExtension(listener);
      const deactivation = registry.onDidDeactivateExtension(listener);
      return {
        dispose() {
          deactivation.dispose();
          activation.dispose();
        },
      };
    },
  };
}

export function createWorkbenchExtensionCatalogReader(
  registry: ExtensionCatalogRegistry,
): WorkbenchExtensionCatalogReader {
  return {
    getDependencyDiagnostics: () => registry.getDependencyDiagnostics(),
    getExtension: (extensionId) => registry.getExtension(extensionId),
    getExtensions: () => registry.getExtensions(),
    getFeatureInspections: () => registry.getFeatureInspections(),
    getFeatureSpecs: () => registry.getFeatureSpecs(),
    listCapabilityProviderIds: () => registry.capabilityRegistry.listProviderIds(),
  };
}

export function createWorkbenchSettingsCapabilityPublisher(
  registry: SettingsCapabilityRegistry,
): WorkbenchSettingsCapabilityPublisher {
  return {
    publishSettingsCapability: (capability) => {
      if (registry.has(WORKBENCH_SETTINGS_CAPABILITY_ID)) {
        return { kind: 'already-registered' };
      }

      try {
        return {
          disposable: registry.register({
            id: WORKBENCH_SETTINGS_CAPABILITY_ID,
            get: () => capability,
          }),
          kind: 'registered',
        };
      } catch (error) {
        if (registry.has(WORKBENCH_SETTINGS_CAPABILITY_ID)) {
          return { kind: 'already-registered' };
        }
        throw error;
      }
    },
  };
}
