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
  capabilities?: ExtensionCapabilities;
  contributes?: ExtensionContributes;
  extensionDependencies?: string[];
  extensionOptionalDependencies?: string[];
  extensionPack?: string[];
  permissions?: string[];
};

export type ExtensionCapabilities = {
  requires?: string[];
  provides?: string[];
};

export {
  DEFAULT_EDITOR_HOST_FACTORY_ID,
  DEFAULT_VIEW_HOST_FACTORY_ID,
  WORKBENCH_MENU_COMMAND_PALETTE,
  WORKBENCH_MENU_EDITOR_CONTEXT,
  WORKBENCH_MENU_EDITOR_TAB_CONTEXT,
  WORKBENCH_MENU_EDITOR_TITLE,
  WORKBENCH_MENU_EXPLORER_CONTEXT,
  WORKBENCH_MENU_VIEW_TITLE,
  WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID,
  WORKBENCH_SETTINGS_CAPABILITY_ID,
} from './contributions.js';
export type {
  ExtensionCommandChatSpec,
  ExtensionCommandFeatureSpec,
  ExtensionDocumentViewFeatureSpec,
  ExtensionFeatureCapabilities,
  ExtensionFeatureDependencies,
  ExtensionFeatureSpec,
  ExtensionJsonSchemaLike,
  ExtensionSettingFeatureSpec,
  ExtensionViewContainerFeatureSpec,
  ExtensionViewFeatureSpec,
} from './feature-spec.js';
export type {
  ActivateFunction,
  ActivityContribution,
  CommandContribution,
  ConfigurationContribution,
  ConfigurationPropertyContribution,
  ConfigurationPropertyScope,
  DeactivateFunction,
  EditorDocumentContext,
  EditorDocumentViewContribution,
  EditorDocumentViewKind,
  EditorDocumentViewProvider,
  EditorDocumentViewRenderContext,
  EditorContribution,
  EditorHost,
  EditorHostCreateContext,
  EditorHostFactory,
  EditorResolveContext,
  EditorResolver,
  ExtensionCapabilityProvider,
  ExtensionCapabilityRegistry,
  ExtensionCommandRegistry,
  ExtensionEditorHostFactoryRegistry,
  ExtensionEditorDocumentViewRegistry,
  ExtensionEditorResolverRegistry,
  ExtensionViewHostFactoryRegistry,
  ExtensionContext,
  ExtensionContributes,
  ExtensionViewRegistry,
  KeybindingContribution,
  LocalizationContribution,
  MenuContribution,
  ThemeContribution,
  ViewContainerContribution,
  ViewContribution,
  ViewHost,
  ViewHostCreateContext,
  ViewHostFactory,
  ViewHostSize,
  ViewProvider,
  WorkbenchEditorSavePort,
  WorkbenchEditorServiceCapability,
  WorkbenchMenuLocation,
  WorkbenchSettingsCapability,
} from './contributions.js';
