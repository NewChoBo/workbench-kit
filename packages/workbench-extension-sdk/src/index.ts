import type { ExtensionContributes } from './contributions.js';

export const WORKBENCH_KIT_EXTENSION_SDK_VERSION = '0.0.0' as const;

export type ExtensionManifestSchemaVersion = 1;

export type WorkbenchExtensionManifest = {
  schemaVersion: ExtensionManifestSchemaVersion;
  id: string;
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  engines: {
    workbench: string;
    extensionApi: string;
  };
  activationEvents: string[];
  contributes?: ExtensionContributes;
  extensionDependencies?: string[];
  permissions?: string[];
};

export type {
  ActivateFunction,
  ActivityContribution,
  CommandContribution,
  ConfigurationContribution,
  ConfigurationPropertyContribution,
  ConfigurationPropertyScope,
  DeactivateFunction,
  ExtensionCommandRegistry,
  ExtensionContext,
  ExtensionContributes,
  ExtensionViewRegistry,
  KeybindingContribution,
  MenuContribution,
  ViewContainerContribution,
  ViewContribution,
  ViewHost,
  ViewProvider,
} from './contributions.js';
