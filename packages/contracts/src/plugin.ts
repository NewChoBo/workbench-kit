export type PluginEnablementState = 'disabled' | 'enabled';
export type PluginLifecycleState =
  | 'disabled'
  | 'failed'
  | 'installed'
  | 'installing'
  | 'uninstalled'
  | 'updating';
export type PluginValue<TContext, TValue> = TValue | ((context: TContext) => TValue);
export type PluginPredicate<TContext> = (context: TContext) => boolean;
export type PluginLifecycleFailureCode =
  | 'dependency-missing'
  | 'invalid-descriptor'
  | 'invalid-state'
  | 'not-found'
  | 'permission-denied'
  | 'source-unreachable'
  | 'unknown';
export type PluginTrustState = 'trusted' | 'untrusted' | 'unknown';

export interface PluginDescriptor {
  description?: string;
  displayName: string;
  homepageUrl?: string;
  pluginId: string;
  publisher: string;
  repositoryUrl?: string;
  version: string;
}

export interface PluginSource {
  kind: 'local' | 'manifest-url' | 'url';
  ref: string;
}

export interface PluginCommandDefinition<TContext = void> {
  danger?: PluginValue<TContext, boolean | undefined>;
  icon?: PluginValue<TContext, string | undefined>;
  id: string;
  isEnabled?: PluginPredicate<TContext>;
  isVisible?: PluginPredicate<TContext>;
  label: PluginValue<TContext, string>;
}

export interface PluginMenuSeparatorEntry {
  id?: string;
  type: 'separator';
}

export interface PluginMenuCommandEntry<TContext = void> {
  commandId: string;
  danger?: PluginValue<TContext, boolean | undefined>;
  icon?: PluginValue<TContext, string | undefined>;
  id?: string;
  isEnabled?: PluginPredicate<TContext>;
  isVisible?: PluginPredicate<TContext>;
  surfaces?: readonly string[];
  label?: PluginValue<TContext, string>;
  shortcut?: PluginValue<TContext, string | undefined>;
  type?: 'command';
}

export type PluginMenuEntry<TContext = void> =
  | PluginMenuSeparatorEntry
  | PluginMenuCommandEntry<TContext>;

export interface PluginCommandContribution<TContext = void> {
  commands: readonly PluginCommandDefinition<TContext>[];
  menuEntries: readonly PluginMenuEntry<TContext>[];
}

export interface PluginContributions<TContext = void> {
  commandContributions?: PluginCommandContribution<TContext>;
  menuEntries?: readonly PluginMenuEntry<TContext>[];
  settingsSections?: readonly unknown[];
  surfaces?: readonly string[];
  viewContributions?: readonly unknown[];
}

export interface InstalledPlugin<TContext = void> {
  contributions?: PluginContributions<TContext>;
  description?: string;
  descriptor: PluginDescriptor;
  enabled: PluginEnablementState;
  error?: string;
  installedAt?: string;
  source: PluginSource;
  state: PluginLifecycleState;
  trust: PluginTrustState;
  updatedAt?: string;
}

export interface PluginLifecycleFailure {
  code: PluginLifecycleFailureCode;
  kind: 'plugin:failure';
  pluginId?: string;
  source?: PluginSource;
  message?: string;
}

export interface PluginLifecycleSuccess {
  kind: 'plugin:success';
  plugin: InstalledPlugin;
}

export type PluginLifecycleResult = PluginLifecycleFailure | PluginLifecycleSuccess;

export interface PluginLifecycleService {
  enable(pluginId: string, enabled: boolean): Promise<PluginLifecycleResult>;
  install(
    source: PluginSource,
    options?: { descriptor?: PluginDescriptor; force?: boolean },
  ): Promise<PluginLifecycleResult>;
  uninstall(pluginId: string): Promise<PluginLifecycleResult>;
  update(pluginId: string, source?: PluginSource): Promise<PluginLifecycleResult>;
}

export function isPluginLifecycleFailure(
  result: PluginLifecycleResult,
): result is PluginLifecycleFailure {
  return result.kind === 'plugin:failure';
}

export function isPluginLifecycleSuccess(
  result: PluginLifecycleResult,
): result is PluginLifecycleSuccess {
  return result.kind === 'plugin:success';
}

export function isPluginEnabled(installed: InstalledPlugin): boolean {
  return installed.state === 'installed' && installed.enabled === 'enabled';
}
