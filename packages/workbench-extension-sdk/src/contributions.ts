import type { Disposable } from '@workbench-kit/base';
import type { CommandServiceHandler } from '@workbench-kit/platform';

/** Stable contribution types for workbench.extension.json and activate() registration. */

export interface CommandContribution {
  argsSchema?: Record<string, unknown>;
  category?: string;
  chat?: boolean | { argsHint?: string; description?: string; trigger?: string };
  command: string;
  danger?: boolean;
  description?: string;
  enablement?: string;
  icon?: string;
  requiresApproval?: boolean;
  title: string;
}

export interface KeybindingContribution {
  args?: readonly unknown[];
  command: string;
  key: string;
  when?: string;
}

export interface ViewContainerContribution {
  icon?: string;
  id: string;
  order?: number;
  title: string;
}

export interface ViewContribution {
  containerId: string;
  id: string;
  name: string;
  when?: string;
}

export const WORKBENCH_MENU_COMMAND_PALETTE = 'commandPalette' as const;
export const WORKBENCH_MENU_EDITOR_CONTEXT = 'editor/context' as const;
export const WORKBENCH_MENU_EDITOR_TITLE = 'editor/title' as const;
export const WORKBENCH_MENU_EDITOR_TAB_CONTEXT = 'editor/tab/context' as const;
export const WORKBENCH_MENU_EXPLORER_CONTEXT = 'explorer/context' as const;
export const WORKBENCH_MENU_VIEW_TITLE = 'view/title' as const;

export type WorkbenchMenuLocation =
  | typeof WORKBENCH_MENU_COMMAND_PALETTE
  | typeof WORKBENCH_MENU_EDITOR_CONTEXT
  | typeof WORKBENCH_MENU_EDITOR_TITLE
  | typeof WORKBENCH_MENU_EDITOR_TAB_CONTEXT
  | typeof WORKBENCH_MENU_EXPLORER_CONTEXT
  | typeof WORKBENCH_MENU_VIEW_TITLE
  | (string & {});

export interface MenuContribution {
  command: string;
  group?: string;
  menu: WorkbenchMenuLocation;
  order?: number;
  when?: string;
}

export interface ActivityContribution {
  icon: string;
  id: string;
  order?: number;
  title: string;
  viewContainerId: string;
  when?: string;
}

export type ConfigurationPropertyScope = 'application' | 'workspace' | 'window';

export interface ConfigurationPropertyContribution {
  default?: unknown;
  description?: string;
  enum?: readonly (boolean | number | string)[];
  scope?: ConfigurationPropertyScope;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

export interface ConfigurationContribution {
  properties: Record<string, ConfigurationPropertyContribution>;
}

export interface EditorContribution {
  icon?: string;
  id: string;
  label: string;
}

export type EditorDocumentViewKind = 'form' | 'preview';

export interface EditorDocumentViewContribution {
  filenamePatterns?: readonly string[];
  id: string;
  kind: EditorDocumentViewKind;
  label: string;
  mimeTypes?: readonly string[];
  priority?: number | undefined;
  when?: string | undefined;
}

export interface ThemeContribution {
  id: string;
  label: string;
  tokenOverrides?: Record<string, string>;
}

export interface LocalizationContribution {
  locale: string;
  label: string;
  translations: Record<string, string>;
}

export interface ExtensionContributes {
  activities?: ActivityContribution[];
  commands?: CommandContribution[];
  configuration?: ConfigurationContribution;
  documentViews?: EditorDocumentViewContribution[];
  editors?: EditorContribution[];
  keybindings?: KeybindingContribution[];
  localizations?: LocalizationContribution[];
  menus?: MenuContribution[];
  themes?: ThemeContribution[];
  views?: Record<string, ViewContribution[]>;
  viewContainers?: Record<string, ViewContainerContribution[]>;
}

export interface ViewHostSize {
  height: number;
  width: number;
}

export interface ViewHost {
  readonly closable?: boolean;
  readonly icon?: string;
  readonly id?: string;
  readonly title?: string;
  dispose(): void;
  onDidBlur?(): void;
  onDidFocus?(): void;
  onDidHide?(): void;
  onDidResize?(size: ViewHostSize): void;
  onDidShow?(): void;
  render(): unknown;
}

export interface ViewProvider {
  readonly viewId: string;
  resolveViewHost(): ViewHost;
}

export interface ViewHostCreateContext {
  readonly provider: ViewProvider;
  readonly viewId: string;
}

export interface ViewHostFactory {
  readonly id: string;
  readonly priority?: number | undefined;
  canCreate?(context: ViewHostCreateContext): boolean;
  create(context: ViewHostCreateContext): ViewHost;
}

export const DEFAULT_VIEW_HOST_FACTORY_ID = 'workbench-kit.view-host.provider' as const;

export interface EditorHost {
  readonly dirty?: boolean;
  readonly icon?: string;
  readonly pinned?: boolean;
  readonly preview?: boolean;
  readonly title?: string;
  dispose(): void;
  onDidChangeDirty?(dirty: boolean): void;
  render(): unknown;
}

export interface EditorHostCreateContext {
  readonly editorId: string;
  readonly resource?: unknown | undefined;
  readonly resourceMissing?: boolean | undefined;
  readonly resourceUri?: string | undefined;
  readonly tabId?: string | undefined;
}

export interface EditorHostFactory {
  readonly id: string;
  readonly priority?: number | undefined;
  canCreate?(context: EditorHostCreateContext): boolean;
  create(context: EditorHostCreateContext): EditorHost;
}

export const DEFAULT_EDITOR_HOST_FACTORY_ID = 'workbench-kit.editor-host.default' as const;

export interface WorkbenchEditorSavePort {
  applySave(resourceUri: string, content: string): { readonly transactionId: string } | undefined;
  resolveResource?(resourceUri: string): unknown;
}

export const WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID = 'workbench.editorService' as const;

export interface WorkbenchEditorServiceCapability {
  openEditor(input: {
    pinned?: boolean | undefined;
    preview?: boolean | undefined;
    resourceUri: string;
    title?: string | undefined;
  }): unknown;
}

export const WORKBENCH_SETTINGS_CAPABILITY_ID = 'workbench.settings' as const;

export interface WorkbenchSettingsCapability {
  openSettings(): void;
}

export interface ExtensionViewHostFactoryRegistry {
  registerFactory(factory: ViewHostFactory): Disposable;
}

export interface ExtensionEditorHostFactoryRegistry {
  registerFactory(factory: EditorHostFactory): Disposable;
}

export interface EditorResolveContext {
  readonly resourceUri: string;
}

export interface EditorResolver {
  readonly id: string;
  readonly priority?: number | undefined;
  canResolve?(context: EditorResolveContext): boolean;
  resolve(context: EditorResolveContext): string;
}

export interface ExtensionEditorResolverRegistry {
  registerResolver(resolver: EditorResolver): Disposable;
}

export interface EditorDocumentContext {
  readonly content: string;
  readonly mimeType?: string | undefined;
  readonly path: string;
  readonly resourceUri: string;
}

export interface EditorDocumentViewRenderContext {
  readonly document: EditorDocumentContext;
  readonly onContentChange: (content: string) => void;
}

export interface EditorDocumentViewProvider extends EditorDocumentViewContribution {
  matches?(document: EditorDocumentContext): boolean;
  render(context: EditorDocumentViewRenderContext): unknown;
}

export interface ExtensionEditorDocumentViewRegistry {
  registerProvider(provider: EditorDocumentViewProvider): Disposable;
}

export interface ExtensionCapabilityProvider<T = unknown> {
  readonly id: string;
  dispose?: () => void;
  get(): T;
}

export interface ExtensionCapabilityRegistry {
  registerProvider<T>(provider: ExtensionCapabilityProvider<T>): Disposable;
}

export interface ExtensionContext {
  readonly capabilities: ExtensionCapabilityRegistry;
  readonly commands: ExtensionCommandRegistry;
  readonly editorDocumentViews: ExtensionEditorDocumentViewRegistry;
  readonly editorHostFactories: ExtensionEditorHostFactoryRegistry;
  readonly editorResolvers: ExtensionEditorResolverRegistry;
  readonly extensionId: string;
  readonly extensionPath: string;
  readonly subscriptions: { add(disposable: Disposable): void };
  readonly viewHostFactories: ExtensionViewHostFactoryRegistry;
  readonly views: ExtensionViewRegistry;
  getCapability<T>(capabilityId: string): T | undefined;
}

export interface ExtensionCommandRegistry {
  registerCommand(commandId: string, handler: CommandServiceHandler): Disposable;
}

export interface ExtensionViewRegistry {
  registerViewProvider(provider: ViewProvider): Disposable;
}

export type ActivateFunction = (context: ExtensionContext) => void | Promise<void> | Disposable;

export type DeactivateFunction = () => void | Promise<void>;
