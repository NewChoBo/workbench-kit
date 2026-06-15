import type { Disposable } from '@workbench-kit/base';
import type { CommandServiceHandler } from '@workbench-kit/platform';

/** Stable contribution types for workbench.extension.json and activate() registration. */

export interface CommandContribution {
  category?: string;
  command: string;
  enablement?: string;
  icon?: string;
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
  title: string;
}

export interface ViewContribution {
  containerId: string;
  id: string;
  name: string;
  when?: string;
}

export interface MenuContribution {
  command: string;
  group?: string;
  menu: string;
  order?: number;
  when?: string;
}

export interface ActivityContribution {
  icon: string;
  id: string;
  title: string;
  viewContainerId: string;
  when?: string;
}

export type ConfigurationPropertyScope = 'application' | 'workspace' | 'window';

export interface ConfigurationPropertyContribution {
  default?: unknown;
  description?: string;
  scope?: ConfigurationPropertyScope;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
}

export interface ConfigurationContribution {
  properties: Record<string, ConfigurationPropertyContribution>;
}

export interface ExtensionContributes {
  activities?: ActivityContribution[];
  commands?: CommandContribution[];
  configuration?: ConfigurationContribution;
  keybindings?: KeybindingContribution[];
  menus?: MenuContribution[];
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
  readonly extensionId: string;
  readonly extensionPath: string;
  readonly subscriptions: { add(disposable: Disposable): void };
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
