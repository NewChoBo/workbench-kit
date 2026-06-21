import type {
  ActivityContribution,
  ConfigurationPropertyContribution,
  EditorDocumentViewContribution,
  EditorContribution,
  KeybindingContribution,
  LocalizationContribution,
  MenuContribution,
  ThemeContribution,
  ViewContainerContribution,
  ViewContribution,
} from './contributions.js';

export type ExtensionJsonSchemaLike = Readonly<Record<string, unknown>>;

export interface ExtensionCommandChatSpec {
  readonly argsHint?: string | undefined;
  readonly description?: string | undefined;
  readonly trigger?: string | undefined;
}

export interface ExtensionCommandFeatureSpec {
  readonly argsSchema?: ExtensionJsonSchemaLike | undefined;
  readonly category?: string | undefined;
  readonly chat?: boolean | ExtensionCommandChatSpec | undefined;
  readonly command: string;
  readonly danger?: boolean | undefined;
  readonly description?: string | undefined;
  readonly enablement?: string | undefined;
  readonly icon?: string | undefined;
  readonly id: string;
  readonly requiresApproval?: boolean | undefined;
  readonly title: string;
}

export interface ExtensionSettingFeatureSpec extends ConfigurationPropertyContribution {
  readonly key: string;
}

export type ExtensionDocumentViewFeatureSpec = EditorDocumentViewContribution;

export interface ExtensionViewContainerFeatureSpec extends ViewContainerContribution {
  readonly location: string;
}

export interface ExtensionViewFeatureSpec extends ViewContribution {
  readonly containerId: string;
}

export interface ExtensionFeatureDependencies {
  readonly extensionDependencies: readonly string[];
  readonly extensionOptionalDependencies: readonly string[];
  readonly extensionPack: readonly string[];
}

export interface ExtensionFeatureCapabilities {
  readonly provides: readonly string[];
  readonly requires: readonly string[];
}

export interface ExtensionFeatureSpec {
  readonly activationEvents: readonly string[];
  readonly activities: readonly ActivityContribution[];
  readonly capabilities: ExtensionFeatureCapabilities;
  readonly commands: readonly ExtensionCommandFeatureSpec[];
  readonly dependencies: ExtensionFeatureDependencies;
  readonly displayName: string;
  readonly documentViews: readonly ExtensionDocumentViewFeatureSpec[];
  readonly editors: readonly EditorContribution[];
  readonly engines: {
    readonly extensionApi: string;
    readonly workbench: string;
  };
  readonly extensionPath?: string | undefined;
  readonly id: string;
  readonly keybindings: readonly KeybindingContribution[];
  readonly localizations: readonly LocalizationContribution[];
  readonly menus: readonly MenuContribution[];
  readonly name: string;
  readonly permissions: readonly string[];
  readonly publisher: string;
  readonly settings: readonly ExtensionSettingFeatureSpec[];
  readonly themes: readonly ThemeContribution[];
  readonly version: string;
  readonly viewContainers: readonly ExtensionViewContainerFeatureSpec[];
  readonly views: readonly ExtensionViewFeatureSpec[];
}
