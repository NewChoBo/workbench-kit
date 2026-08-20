import {
  DisposableStore,
  Emitter,
  isDisposable,
  toDisposable,
  type Disposable,
} from '@workbench-kit/base';
import {
  CommandRegistry,
  CommandNoHandlerError,
  CommandNotFoundError,
  KeybindingRegistry,
  type CommandServiceHandler,
} from '@workbench-kit/platform';
import type {
  ActivateFunction,
  DeactivateFunction,
  ExtensionFeatureSpec,
  ExtensionContext,
  WorkbenchExtensionManifest,
} from '@workbench-kit/workbench-extension-sdk';

import {
  ActivityRegistry,
  ConfigurationRegistry,
  EditorRegistry,
  MenuRegistry,
  StatusBarRegistry,
  ViewRegistry,
} from '../contributions/registries.js';
import { CapabilityRegistry, type CapabilityProvider } from '../capability/registry.js';
import {
  createEditorHostFactoryRegistry,
  createViewHostFactoryRegistry,
  type EditorHostFactoryRegistry,
  type ViewHostFactoryRegistry,
} from '../host/factory-registry.js';
import {
  createEditorResolverRegistry,
  type EditorResolverRegistry,
} from '../editor/resolver-registry.js';
import {
  createEditorDocumentViewProviderRegistry,
  type EditorDocumentViewProviderRegistry,
} from '../editor/document-view-registry.js';
import { LocalizationRegistry } from '../localization/registry.js';
import { ThemeRegistry } from '../theme/registry.js';
import { assertCapabilityAccess } from './permissions.js';
import { createExtensionFeatureSpecs } from './feature-spec.js';
import {
  normalizeConfiguration,
  normalizeMenuContributions,
  normalizePanels,
  normalizeStatusBar,
  normalizeViewContainers,
  normalizeViews,
  toCommandDefinition,
  toKeybindingDefinition,
} from './contribution-normalizers.js';

export interface WorkbenchExtensionModule {
  activate?: ActivateFunction;
  deactivate?: DeactivateFunction;
}

export interface WorkbenchExtensionDescription {
  extensionPath?: string;
  manifest: WorkbenchExtensionManifest;
  module?: WorkbenchExtensionModule;
}

export interface ExtensionRegistryOptions {
  activities?: ActivityRegistry;
  capabilityRegistry?: CapabilityRegistry;
  commands?: CommandRegistry;
  configurations?: ConfigurationRegistry;
  editorDocumentViews?: EditorDocumentViewProviderRegistry;
  editorHostFactories?: EditorHostFactoryRegistry;
  editorResolvers?: EditorResolverRegistry;
  editors?: EditorRegistry;
  keybindings?: KeybindingRegistry;
  localizations?: LocalizationRegistry;
  menus?: MenuRegistry;
  statusBar?: StatusBarRegistry;
  themes?: ThemeRegistry;
  viewHostFactories?: ViewHostFactoryRegistry;
  views?: ViewRegistry;
}

export interface ActivatedExtension {
  readonly extensionId: string;
  readonly subscriptions: DisposableStore;
}

export interface ExtensionLifecycleEvent {
  readonly extensionId: string;
}

export interface ExtensionFeatureInspection {
  readonly diagnostics: readonly ExtensionDependencyDiagnostic[];
  readonly feature: ExtensionFeatureSpec;
}

export type ExtensionDependencyDiagnosticSeverity = 'error' | 'warning';

export type ExtensionDependencyDiagnosticKind =
  | 'command-activation-missing'
  | 'duplicate-capability-provider'
  | 'host-capability-provider-conflict'
  | 'missing-capability'
  | 'missing-extension-dependency'
  | 'missing-optional-extension-dependency';

export interface ExtensionDependencyDiagnostic {
  readonly capabilityId?: string | undefined;
  readonly commandId?: string | undefined;
  readonly dependencyId?: string | undefined;
  readonly extensionId: string;
  readonly kind: ExtensionDependencyDiagnosticKind;
  readonly message: string;
  readonly providerExtensionIds?: readonly string[] | undefined;
  readonly severity: ExtensionDependencyDiagnosticSeverity;
}

interface RegisteredExtension {
  readonly contributionDisposables: DisposableStore;
  readonly description: WorkbenchExtensionDescription;
  invalidated: boolean;
}

interface PendingActivation {
  readonly promise: Promise<ActivatedExtension>;
  readonly registration: RegisteredExtension;
  readonly subscriptions: DisposableStore;
}

interface ActiveExtension {
  readonly deactivate?: DeactivateFunction;
  readonly extensionId: string;
  readonly subscriptions: DisposableStore;
}

export class ExtensionRegistry implements Disposable {
  readonly activities: ActivityRegistry;
  readonly capabilityRegistry: CapabilityRegistry;
  readonly commands: CommandRegistry;
  readonly configurations: ConfigurationRegistry;
  readonly editorDocumentViews: EditorDocumentViewProviderRegistry;
  readonly editorHostFactories: EditorHostFactoryRegistry;
  readonly editorResolvers: EditorResolverRegistry;
  readonly editors: EditorRegistry;
  readonly keybindings: KeybindingRegistry;
  readonly localizations: LocalizationRegistry;
  readonly menus: MenuRegistry;
  readonly statusBar: StatusBarRegistry;
  readonly themes: ThemeRegistry;
  readonly viewHostFactories: ViewHostFactoryRegistry;
  readonly views: ViewRegistry;

  private readonly onDidActivateExtensionEmitter = new Emitter<ExtensionLifecycleEvent>();
  private readonly onDidDeactivateExtensionEmitter = new Emitter<ExtensionLifecycleEvent>();
  private readonly activeExtensions = new Map<string, ActiveExtension>();
  private readonly activatingExtensions = new Map<string, PendingActivation>();
  private readonly extensions = new Map<string, RegisteredExtension>();

  readonly onDidActivateExtension = this.onDidActivateExtensionEmitter.event;
  readonly onDidDeactivateExtension = this.onDidDeactivateExtensionEmitter.event;

  constructor(options: ExtensionRegistryOptions = {}) {
    this.activities = options.activities ?? new ActivityRegistry();
    this.commands = options.commands ?? new CommandRegistry();
    this.configurations = options.configurations ?? new ConfigurationRegistry();
    this.keybindings = options.keybindings ?? new KeybindingRegistry();
    this.localizations = options.localizations ?? new LocalizationRegistry();
    this.menus = options.menus ?? new MenuRegistry();
    this.statusBar = options.statusBar ?? new StatusBarRegistry();
    this.themes = options.themes ?? new ThemeRegistry();
    this.views = options.views ?? new ViewRegistry();
    this.capabilityRegistry = options.capabilityRegistry ?? new CapabilityRegistry();

    this.editorDocumentViews =
      options.editorDocumentViews ?? createEditorDocumentViewProviderRegistry();
    this.viewHostFactories = options.viewHostFactories ?? createViewHostFactoryRegistry();
    this.editorHostFactories = options.editorHostFactories ?? createEditorHostFactoryRegistry();
    this.editorResolvers = options.editorResolvers ?? createEditorResolverRegistry();
    this.editors = options.editors ?? new EditorRegistry();
  }

  getActiveExtensions(): readonly ActivatedExtension[] {
    return [...this.activeExtensions.values()].map(({ extensionId, subscriptions }) => ({
      extensionId,
      subscriptions,
    }));
  }

  getExtension(extensionId: string): WorkbenchExtensionDescription | undefined {
    return this.extensions.get(extensionId)?.description;
  }

  getExtensions(): readonly WorkbenchExtensionDescription[] {
    return [...this.extensions.values()].map((entry) => entry.description);
  }

  getFeatureSpecs(): readonly ExtensionFeatureSpec[] {
    return createExtensionFeatureSpecs(this.getExtensions());
  }

  getFeatureInspections(): readonly ExtensionFeatureInspection[] {
    const diagnostics = this.getDependencyDiagnostics();
    return this.getFeatureSpecs().map((feature) => ({
      diagnostics: diagnostics.filter((diagnostic) => diagnostic.extensionId === feature.id),
      feature,
    }));
  }

  getDependencyDiagnostics(): readonly ExtensionDependencyDiagnostic[] {
    return collectExtensionDependencyDiagnostics(this.getExtensions(), {
      hasCapability: (capabilityId) => this.capabilityRegistry.has(capabilityId),
    });
  }

  isActive(extensionId: string): boolean {
    return this.activeExtensions.has(extensionId);
  }

  registerExtension(description: WorkbenchExtensionDescription): Disposable {
    const { id } = description.manifest;
    if (this.extensions.has(id)) {
      throw new Error(`Extension "${id}" is already registered.`);
    }

    const contributionDisposables = new DisposableStore();
    const entry: RegisteredExtension = { contributionDisposables, description, invalidated: false };
    this.extensions.set(id, entry);

    try {
      this.registerContributions(description, contributionDisposables);
    } catch (error) {
      this.extensions.delete(id);
      contributionDisposables.dispose();
      throw error;
    }

    return toDisposable(() => {
      const current = this.extensions.get(id);
      if (current === entry) {
        this.invalidateRegistration(id, entry);
        this.extensions.delete(id);
        contributionDisposables.dispose();
        void this.deactivateExtension(id);
      }
    });
  }

  registerExtensions(descriptions: Iterable<WorkbenchExtensionDescription>): DisposableStore {
    const store = new DisposableStore();

    try {
      for (const description of descriptions) {
        store.add(this.registerExtension(description));
      }
      this.assertDependencyGraph();
    } catch (error) {
      store.dispose();
      throw error;
    }

    return store;
  }

  async activateByEvent(activationEvent: string): Promise<readonly ActivatedExtension[]> {
    const activated: ActivatedExtension[] = [];
    for (const extension of this.extensions.values()) {
      if (!extension.description.manifest.activationEvents.includes(activationEvent)) {
        continue;
      }

      activated.push(await this.activateExtension(extension.description.manifest.id));
    }

    return activated;
  }

  activateCommand(commandId: string): Promise<readonly ActivatedExtension[]> {
    return this.activateByEvent(`onCommand:${commandId}`);
  }

  activateStartup(): Promise<readonly ActivatedExtension[]> {
    return this.activateByEvent('onStartup');
  }

  activateView(viewId: string): Promise<readonly ActivatedExtension[]> {
    return this.activateByEvent(`onView:${viewId}`);
  }

  async executeCommand(commandId: string, ...args: unknown[]): Promise<unknown> {
    await this.activateCommand(commandId);

    const command = this.commands.getCommand(commandId);
    if (!command) {
      throw new CommandNotFoundError(commandId);
    }

    if (!command.handler) {
      throw new CommandNoHandlerError(commandId);
    }

    return await command.handler(...args);
  }

  async activateExtension(extensionId: string): Promise<ActivatedExtension> {
    const active = this.activeExtensions.get(extensionId);
    if (active) {
      return {
        extensionId,
        subscriptions: active.subscriptions,
      };
    }

    const registration = this.extensions.get(extensionId);
    if (!registration) {
      throw new Error(`Extension "${extensionId}" is not registered.`);
    }

    const pending = this.activatingExtensions.get(extensionId);
    if (pending?.registration === registration) {
      return pending.promise;
    }

    let resolveActivation: (extension: ActivatedExtension) => void = () => undefined;
    let rejectActivation: (error: unknown) => void = () => undefined;
    const activation = new Promise<ActivatedExtension>((resolve, reject) => {
      resolveActivation = resolve;
      rejectActivation = reject;
    });
    const pendingActivation: PendingActivation = {
      promise: activation,
      registration,
      subscriptions: new DisposableStore(),
    };
    this.activatingExtensions.set(extensionId, pendingActivation);
    void this.doActivateExtension(extensionId, pendingActivation).then(
      resolveActivation,
      rejectActivation,
    );

    try {
      return await activation;
    } finally {
      if (this.activatingExtensions.get(extensionId) === pendingActivation) {
        this.activatingExtensions.delete(extensionId);
      }
    }
  }

  private async doActivateExtension(
    extensionId: string,
    pendingActivation: PendingActivation,
  ): Promise<ActivatedExtension> {
    const { registration: extension, subscriptions } = pendingActivation;
    try {
      this.assertCurrentRegistration(extensionId, extension);

      for (const dependencyId of extension.description.manifest.extensionDependencies ?? []) {
        await this.activateExtension(dependencyId);
      }

      this.assertCurrentRegistration(extensionId, extension);

      const context = this.createExtensionContext(extension.description, subscriptions);
      const activationResult = await extension.description.module?.activate?.(context);
      if (isDisposable(activationResult)) {
        subscriptions.add(activationResult);
      }

      this.assertCurrentRegistration(extensionId, extension);

      this.activeExtensions.set(extensionId, {
        deactivate: extension.description.module?.deactivate,
        extensionId,
        subscriptions,
      });
      this.onDidActivateExtensionEmitter.fire({ extensionId });

      return {
        extensionId,
        subscriptions,
      };
    } catch (error) {
      subscriptions.dispose();
      throw error;
    }
  }

  async deactivateExtension(extensionId: string): Promise<void> {
    const active = this.activeExtensions.get(extensionId);
    if (!active) {
      return;
    }

    this.activeExtensions.delete(extensionId);
    await active.deactivate?.();
    active.subscriptions.dispose();
    this.onDidDeactivateExtensionEmitter.fire({ extensionId });
  }

  async deactivateAll(): Promise<void> {
    for (const extensionId of [...this.activeExtensions.keys()].reverse()) {
      await this.deactivateExtension(extensionId);
    }
  }

  dispose(): void {
    for (const [extensionId, extension] of this.extensions) {
      this.invalidateRegistration(extensionId, extension);
    }
    void this.deactivateAll();
    for (const extension of this.extensions.values()) {
      extension.contributionDisposables.dispose();
    }
    this.extensions.clear();
    this.activities.dispose();
    this.commands.dispose();
    this.configurations.dispose();
    this.keybindings.dispose();
    this.localizations.dispose();
    this.menus.dispose();
    this.statusBar.dispose();
    this.themes.dispose();
    this.views.dispose();
    this.editors.dispose();
    this.editorDocumentViews.dispose();
    this.viewHostFactories.dispose();
    this.editorHostFactories.dispose();
    this.editorResolvers.dispose();
    this.capabilityRegistry.dispose();
    this.onDidActivateExtensionEmitter.dispose();
    this.onDidDeactivateExtensionEmitter.dispose();
  }

  private assertCurrentRegistration(extensionId: string, registration: RegisteredExtension): void {
    if (registration.invalidated || this.extensions.get(extensionId) !== registration) {
      throw new Error(`Extension "${extensionId}" activation was invalidated.`);
    }
  }

  private invalidateRegistration(extensionId: string, registration: RegisteredExtension): void {
    registration.invalidated = true;
    const pendingActivation = this.activatingExtensions.get(extensionId);
    if (pendingActivation?.registration === registration) {
      pendingActivation.subscriptions.dispose();
      this.activatingExtensions.delete(extensionId);
    }
  }

  private assertDependencyGraph(): void {
    for (const extension of this.extensions.values()) {
      for (const dependencyId of extension.description.manifest.extensionDependencies ?? []) {
        if (!this.extensions.has(dependencyId)) {
          throw new Error(
            `Extension "${extension.description.manifest.id}" depends on missing extension "${dependencyId}".`,
          );
        }
      }
    }

    for (const extensionId of this.extensions.keys()) {
      this.assertNoDependencyCycle(extensionId, []);
    }
  }

  private assertNoDependencyCycle(extensionId: string, path: string[]): void {
    if (path.includes(extensionId)) {
      throw new Error(
        `Extension dependency cycle detected: ${[...path, extensionId].join(' -> ')}`,
      );
    }

    const extension = this.extensions.get(extensionId);
    if (!extension) {
      return;
    }

    for (const dependencyId of extension.description.manifest.extensionDependencies ?? []) {
      this.assertNoDependencyCycle(dependencyId, [...path, extensionId]);
    }
  }

  private createExtensionContext(
    description: WorkbenchExtensionDescription,
    subscriptions: DisposableStore,
  ): ExtensionContext {
    return {
      capabilities: {
        registerProvider: <T>(provider: CapabilityProvider<T>) =>
          subscriptions.add(this.capabilityRegistry.register(provider)),
      },
      commands: {
        registerCommand: (commandId, handler) =>
          subscriptions.add(this.registerCommandHandler(commandId, handler)),
      },
      editorDocumentViews: {
        registerProvider: (provider) =>
          subscriptions.add(this.editorDocumentViews.registerProvider(provider)),
      },
      editorHostFactories: {
        registerFactory: (factory) => subscriptions.add(this.editorHostFactories.register(factory)),
      },
      editorResolvers: {
        registerResolver: (resolver) => subscriptions.add(this.editorResolvers.register(resolver)),
      },
      extensionId: description.manifest.id,
      extensionPath: description.extensionPath ?? '',
      getCapability: <T>(capabilityId: string) => {
        const permissions = [...(description.manifest.permissions ?? [])];
        const requiredCapabilities = [...(description.manifest.capabilities?.requires ?? [])];
        assertCapabilityAccess(
          {
            extensionId: description.manifest.id,
            permissions,
            requiredCapabilities,
          },
          capabilityId,
        );
        return this.capabilityRegistry.get<T>(capabilityId);
      },
      permissions: [...(description.manifest.permissions ?? [])],
      requiredCapabilities: [...(description.manifest.capabilities?.requires ?? [])],
      subscriptions,
      viewHostFactories: {
        registerFactory: (factory) => subscriptions.add(this.viewHostFactories.register(factory)),
      },
      views: {
        registerViewProvider: (provider) =>
          subscriptions.add(this.views.registerViewProvider(provider)),
      },
    };
  }

  private registerCommandHandler(commandId: string, handler: CommandServiceHandler): Disposable {
    const command = this.commands.getCommand(commandId);
    if (!command) {
      return this.commands.registerCommand({
        handler,
        id: commandId,
        title: commandId,
      });
    }

    const previousHandler = command.handler;
    command.handler = handler;

    return toDisposable(() => {
      if (command.handler === handler) {
        command.handler = previousHandler;
      }
    });
  }

  private registerContributions(
    description: WorkbenchExtensionDescription,
    disposables: DisposableStore,
  ): void {
    const contributes = description.manifest.contributes;
    if (!contributes) {
      return;
    }

    for (const command of contributes.commands ?? []) {
      disposables.add(this.commands.registerCommand(toCommandDefinition(command)));
    }

    for (const keybinding of contributes.keybindings ?? []) {
      disposables.add(this.keybindings.registerKeybinding(toKeybindingDefinition(keybinding)));
    }

    for (const menu of normalizeMenuContributions(contributes.menus)) {
      disposables.add(this.menus.registerMenuItem(menu));
    }

    const panels = normalizePanels(contributes.panels);
    for (const container of panels.containers) {
      disposables.add(this.views.registerViewContainer(container));
    }

    for (const view of panels.views) {
      disposables.add(this.views.registerView(view));
    }

    for (const container of normalizeViewContainers(contributes.viewContainers)) {
      disposables.add(this.views.registerViewContainer(container));
    }

    for (const view of normalizeViews(contributes.views)) {
      disposables.add(this.views.registerView(view));
    }

    for (const activity of contributes.activities ?? []) {
      disposables.add(
        this.activities.registerActivity({
          ...activity,
          extensionId: description.manifest.id,
        }),
      );
    }

    for (const statusBarItem of normalizeStatusBar(contributes.statusBar)) {
      disposables.add(
        this.statusBar.registerStatusBarItem({
          ...statusBarItem,
          extensionId: description.manifest.id,
        }),
      );
    }

    for (const editor of contributes.editors ?? []) {
      disposables.add(
        this.editors.registerEditor({
          ...editor,
          extensionId: description.manifest.id,
        }),
      );
    }

    if (contributes.configuration !== undefined) {
      disposables.add(
        this.configurations.registerConfiguration(
          description.manifest.id,
          normalizeConfiguration(contributes.configuration),
        ),
      );
    }

    for (const theme of contributes.themes ?? []) {
      disposables.add(
        this.themes.registerTheme({
          ...theme,
          extensionId: description.manifest.id,
        }),
      );
    }

    for (const localization of contributes.localizations ?? []) {
      disposables.add(
        this.localizations.registerLocalization({
          ...localization,
          extensionId: description.manifest.id,
        }),
      );
    }
  }
}

export function collectExtensionDependencyDiagnostics(
  descriptions: readonly WorkbenchExtensionDescription[],
  options: {
    hasCapability?: ((capabilityId: string) => boolean) | undefined;
  } = {},
): ExtensionDependencyDiagnostic[] {
  const diagnostics: ExtensionDependencyDiagnostic[] = [];
  const extensionIds = new Set(descriptions.map((description) => description.manifest.id));
  const capabilityProviders = collectCapabilityProviders(descriptions);

  for (const [capabilityId, providerExtensionIds] of capabilityProviders) {
    if (providerExtensionIds.length > 1) {
      diagnostics.push({
        capabilityId,
        extensionId: providerExtensionIds[0] ?? 'unknown',
        kind: 'duplicate-capability-provider',
        message: `Capability "${capabilityId}" is provided by multiple extensions: ${providerExtensionIds
          .map((extensionId) => `"${extensionId}"`)
          .join(', ')}.`,
        providerExtensionIds,
        severity: 'error',
      });
    }

    if (options.hasCapability?.(capabilityId)) {
      diagnostics.push({
        capabilityId,
        extensionId: providerExtensionIds[0] ?? 'unknown',
        kind: 'host-capability-provider-conflict',
        message: `Capability "${capabilityId}" is already provided by the host.`,
        providerExtensionIds,
        severity: 'error',
      });
    }
  }

  for (const description of descriptions) {
    const { manifest } = description;

    for (const dependencyId of manifest.extensionDependencies ?? []) {
      if (!extensionIds.has(dependencyId)) {
        diagnostics.push({
          dependencyId,
          extensionId: manifest.id,
          kind: 'missing-extension-dependency',
          message: `Extension "${manifest.id}" depends on missing extension "${dependencyId}".`,
          severity: 'error',
        });
      }
    }

    for (const dependencyId of manifest.extensionOptionalDependencies ?? []) {
      if (!extensionIds.has(dependencyId)) {
        diagnostics.push({
          dependencyId,
          extensionId: manifest.id,
          kind: 'missing-optional-extension-dependency',
          message: `Extension "${manifest.id}" optionally depends on unavailable extension "${dependencyId}".`,
          severity: 'warning',
        });
      }
    }

    for (const capabilityId of manifest.capabilities?.requires ?? []) {
      const providerExtensionIds =
        capabilityProviders
          .get(capabilityId)
          ?.filter((extensionId) => extensionId !== manifest.id) ?? [];
      if (!options.hasCapability?.(capabilityId) && providerExtensionIds.length === 0) {
        diagnostics.push({
          capabilityId,
          extensionId: manifest.id,
          kind: 'missing-capability',
          message: `Extension "${manifest.id}" requires missing capability "${capabilityId}".`,
          severity: 'error',
        });
      }
    }

    for (const command of manifest.contributes?.commands ?? []) {
      const commandActivationEvent = `onCommand:${command.command}`;
      if (
        !manifest.activationEvents.includes('onStartup') &&
        !manifest.activationEvents.includes(commandActivationEvent)
      ) {
        diagnostics.push({
          commandId: command.command,
          extensionId: manifest.id,
          kind: 'command-activation-missing',
          message: `Command "${command.command}" is contributed by "${manifest.id}" without "${commandActivationEvent}" or "onStartup" activation.`,
          severity: 'warning',
        });
      }
    }
  }

  return diagnostics;
}

function collectCapabilityProviders(
  descriptions: readonly WorkbenchExtensionDescription[],
): Map<string, string[]> {
  const providers = new Map<string, string[]>();

  for (const { manifest } of descriptions) {
    for (const capabilityId of manifest.capabilities?.provides ?? []) {
      const extensionIds = providers.get(capabilityId) ?? [];
      extensionIds.push(manifest.id);
      providers.set(capabilityId, extensionIds);
    }
  }

  return providers;
}
