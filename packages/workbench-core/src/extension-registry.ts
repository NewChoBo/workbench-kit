import { DisposableStore, isDisposable, toDisposable, type Disposable } from '@workbench-kit/base';
import {
  CommandRegistry,
  CommandNoHandlerError,
  CommandNotFoundError,
  KeybindingRegistry,
  type CommandDefinition,
  type CommandServiceHandler,
  type KeybindingDefinition,
} from '@workbench-kit/platform';
import type {
  ActivateFunction,
  ConfigurationContribution,
  DeactivateFunction,
  ExtensionContext,
  MenuContribution,
  ViewContainerContribution,
  ViewContribution,
  WorkbenchExtensionManifest,
} from '@workbench-kit/workbench-extension-sdk';

import {
  ActivityRegistry,
  ConfigurationRegistry,
  MenuRegistry,
  ViewRegistry,
  type WorkbenchViewContainerContribution,
  type WorkbenchViewContribution,
} from './registries.js';
import {
  CapabilityRegistry,
  createCapabilityRegistry,
  toCapabilityMap,
  type CapabilityProvider,
} from './capability-registry.js';
import {
  createEditorHostFactoryRegistry,
  createViewHostFactoryRegistry,
  type EditorHostFactoryRegistry,
  type ViewHostFactoryRegistry,
} from './host-factory-registry.js';

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
  capabilities?: ReadonlyMap<string, unknown> | Record<string, unknown>;
  capabilityRegistry?: CapabilityRegistry;
  commands?: CommandRegistry;
  configurations?: ConfigurationRegistry;
  editorHostFactories?: EditorHostFactoryRegistry;
  keybindings?: KeybindingRegistry;
  menus?: MenuRegistry;
  viewHostFactories?: ViewHostFactoryRegistry;
  views?: ViewRegistry;
}

export interface ActivatedExtension {
  readonly extensionId: string;
  readonly subscriptions: DisposableStore;
}

interface RegisteredExtension {
  readonly contributionDisposables: DisposableStore;
  readonly description: WorkbenchExtensionDescription;
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
  readonly editorHostFactories: EditorHostFactoryRegistry;
  readonly keybindings: KeybindingRegistry;
  readonly menus: MenuRegistry;
  readonly viewHostFactories: ViewHostFactoryRegistry;
  readonly views: ViewRegistry;

  private readonly activeExtensions = new Map<string, ActiveExtension>();
  private readonly extensions = new Map<string, RegisteredExtension>();

  constructor(options: ExtensionRegistryOptions = {}) {
    this.activities = options.activities ?? new ActivityRegistry();
    this.commands = options.commands ?? new CommandRegistry();
    this.configurations = options.configurations ?? new ConfigurationRegistry();
    this.keybindings = options.keybindings ?? new KeybindingRegistry();
    this.menus = options.menus ?? new MenuRegistry();
    this.views = options.views ?? new ViewRegistry();
    if (options.capabilityRegistry) {
      this.capabilityRegistry = options.capabilityRegistry;
      if (options.capabilities !== undefined) {
        this.capabilityRegistry.registerStatic(toCapabilityMap(options.capabilities));
      }
    } else {
      this.capabilityRegistry = createCapabilityRegistry(options.capabilities);
    }

    this.viewHostFactories = options.viewHostFactories ?? createViewHostFactoryRegistry();
    this.editorHostFactories = options.editorHostFactories ?? createEditorHostFactoryRegistry();
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

  isActive(extensionId: string): boolean {
    return this.activeExtensions.has(extensionId);
  }

  registerExtension(description: WorkbenchExtensionDescription): Disposable {
    const { id } = description.manifest;
    if (this.extensions.has(id)) {
      throw new Error(`Extension "${id}" is already registered.`);
    }

    const contributionDisposables = new DisposableStore();
    const entry: RegisteredExtension = { contributionDisposables, description };
    this.extensions.set(id, entry);

    try {
      this.registerContributions(description, contributionDisposables);
    } catch (error) {
      this.extensions.delete(id);
      contributionDisposables.dispose();
      throw error;
    }

    return toDisposable(() => {
      void this.deactivateExtension(id);
      const current = this.extensions.get(id);
      if (current === entry) {
        this.extensions.delete(id);
        contributionDisposables.dispose();
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

    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension "${extensionId}" is not registered.`);
    }

    for (const dependencyId of extension.description.manifest.extensionDependencies ?? []) {
      await this.activateExtension(dependencyId);
    }

    const subscriptions = new DisposableStore();
    const context = this.createExtensionContext(extension.description, subscriptions);
    const activationResult = await extension.description.module?.activate?.(context);
    if (isDisposable(activationResult)) {
      subscriptions.add(activationResult);
    }

    this.activeExtensions.set(extensionId, {
      deactivate: extension.description.module?.deactivate,
      extensionId,
      subscriptions,
    });

    return {
      extensionId,
      subscriptions,
    };
  }

  async deactivateExtension(extensionId: string): Promise<void> {
    const active = this.activeExtensions.get(extensionId);
    if (!active) {
      return;
    }

    this.activeExtensions.delete(extensionId);
    await active.deactivate?.();
    active.subscriptions.dispose();
  }

  async deactivateAll(): Promise<void> {
    for (const extensionId of [...this.activeExtensions.keys()].reverse()) {
      await this.deactivateExtension(extensionId);
    }
  }

  dispose(): void {
    void this.deactivateAll();
    for (const extension of this.extensions.values()) {
      extension.contributionDisposables.dispose();
    }
    this.extensions.clear();
    this.activities.dispose();
    this.commands.dispose();
    this.configurations.dispose();
    this.keybindings.dispose();
    this.menus.dispose();
    this.views.dispose();
    this.viewHostFactories.dispose();
    this.editorHostFactories.dispose();
    this.capabilityRegistry.dispose();
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
      editorHostFactories: {
        registerFactory: (factory) => subscriptions.add(this.editorHostFactories.register(factory)),
      },
      extensionId: description.manifest.id,
      extensionPath: description.extensionPath ?? '',
      getCapability: <T>(capabilityId: string) => this.capabilityRegistry.get<T>(capabilityId),
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

    if (contributes.configuration !== undefined) {
      disposables.add(
        this.configurations.registerConfiguration(
          description.manifest.id,
          normalizeConfiguration(contributes.configuration),
        ),
      );
    }
  }
}

function toCommandDefinition(command: {
  category?: string;
  command: string;
  enablement?: string;
  icon?: string;
  title: string;
}): CommandDefinition {
  return {
    category: command.category,
    enablement: command.enablement,
    icon: command.icon,
    id: command.command,
    title: command.title,
  };
}

function toKeybindingDefinition(keybinding: {
  args?: readonly unknown[];
  command: string;
  key: string;
  when?: string;
}): KeybindingDefinition {
  return {
    args: keybinding.args,
    command: keybinding.command,
    key: keybinding.key,
    when: keybinding.when,
  };
}

function normalizeConfiguration(configuration: unknown): ConfigurationContribution {
  if (!isRecord(configuration) || !isRecord(configuration.properties)) {
    return { properties: {} };
  }

  return configuration as unknown as ConfigurationContribution;
}

function normalizeMenuContributions(value: unknown): MenuContribution[] {
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

function normalizeViewContainers(value: unknown): WorkbenchViewContainerContribution[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([location, containers]) => {
    if (!Array.isArray(containers)) {
      return [];
    }

    return containers.map(
      (container) =>
        ({
          ...(container as ViewContainerContribution),
          location,
        }) satisfies WorkbenchViewContainerContribution,
    );
  });
}

function normalizeViews(value: unknown): WorkbenchViewContribution[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([containerId, views]) => {
    if (!Array.isArray(views)) {
      return [];
    }

    return views.map((view) => {
      const partialView = view as Partial<ViewContribution>;
      return {
        ...partialView,
        containerId: partialView.containerId ?? containerId,
      } as WorkbenchViewContribution;
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
