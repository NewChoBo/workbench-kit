import { DisposableStore, toDisposable, type Disposable } from '@workbench-kit/base';
import {
  CommandRegistry,
  CommandNoHandlerError,
  CommandNotFoundError,
  KeybindingRegistry,
} from '@workbench-kit/platform';
import type {
  ActivateFunction,
  DeactivateFunction,
  ExtensionFeatureSpec,
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
import { CapabilityRegistry } from '../capability/registry.js';
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
import { ExtensionActivationService } from './activation-service.js';
import { ExtensionApiFactory } from './api-factory.js';
import { ExtensionContributionRouter } from './contribution-router.js';
import { createExtensionFeatureSpecs } from './feature-spec.js';
import { ExtensionInventory, type RegisteredExtension } from './inventory.js';

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

/**
 * Batch registration lifetime that preserves the historical DisposableStore
 * surface while allowing the composing host to retain a focused handle for an
 * individual registration.
 */
export class ExtensionRegistrationStore extends DisposableStore {
  private readonly registrationsById = new Map<string, Disposable>();

  addRegistration(extensionId: string, registration: Disposable): void {
    this.registrationsById.set(extensionId, registration);
    this.add(registration);
  }

  getRegistration(extensionId: string): Disposable | undefined {
    return this.registrationsById.get(extensionId);
  }

  override dispose(): void {
    try {
      super.dispose();
    } finally {
      this.registrationsById.clear();
    }
  }
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

  private readonly activationService: ExtensionActivationService;
  private readonly contributionRouter: ExtensionContributionRouter;
  private readonly inventory = new ExtensionInventory();
  private readonly registrationLifetimes = new Map<RegisteredExtension, Disposable>();
  private disposed = false;

  readonly onDidActivateExtension: ExtensionActivationService['onDidActivateExtension'];
  readonly onDidDeactivateExtension: ExtensionActivationService['onDidDeactivateExtension'];

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

    this.contributionRouter = new ExtensionContributionRouter({
      activities: this.activities,
      commands: this.commands,
      configurations: this.configurations,
      editors: this.editors,
      keybindings: this.keybindings,
      localizations: this.localizations,
      menus: this.menus,
      statusBar: this.statusBar,
      themes: this.themes,
      views: this.views,
    });
    const apiFactory = new ExtensionApiFactory({
      capabilityRegistry: this.capabilityRegistry,
      commands: this.commands,
      editorDocumentViews: this.editorDocumentViews,
      editorHostFactories: this.editorHostFactories,
      editorResolvers: this.editorResolvers,
      viewHostFactories: this.viewHostFactories,
      views: this.views,
    });
    this.activationService = new ExtensionActivationService(this.inventory, apiFactory);
    this.onDidActivateExtension = this.activationService.onDidActivateExtension;
    this.onDidDeactivateExtension = this.activationService.onDidDeactivateExtension;
  }

  getActiveExtensions(): readonly ActivatedExtension[] {
    return this.activationService.getActiveExtensions();
  }

  getExtension(extensionId: string): WorkbenchExtensionDescription | undefined {
    return this.inventory.get(extensionId);
  }

  getExtensions(): readonly WorkbenchExtensionDescription[] {
    return this.inventory.list();
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
    return this.activationService.isActive(extensionId);
  }

  registerExtension(description: WorkbenchExtensionDescription): Disposable {
    const { id } = description.manifest;
    const inventoryRegistration = this.inventory.register(description);
    const registration = this.inventory.getRegistration(id);
    if (!registration) {
      inventoryRegistration.dispose();
      throw new Error(`Extension "${id}" registration was not retained.`);
    }

    let contributionDisposables: DisposableStore;
    try {
      contributionDisposables = this.contributionRouter.registerManifestContributions(description);
    } catch (error) {
      inventoryRegistration.dispose();
      throw error;
    }

    const registrationLifetime = toDisposable(() => {
      if (this.inventory.getRegistration(id) !== registration) {
        return;
      }

      let firstError: unknown;
      let hasError = false;
      for (const cleanup of [
        () => this.activationService.invalidateRegistration(id, registration),
        () => inventoryRegistration.dispose(),
        () => contributionDisposables.dispose(),
      ]) {
        try {
          cleanup();
        } catch (error) {
          if (!hasError) {
            firstError = error;
            hasError = true;
          }
        }
      }

      this.registrationLifetimes.delete(registration);
      void this.deactivateExtension(id).catch(() => undefined);
      if (hasError) {
        throw firstError;
      }
    });
    this.registrationLifetimes.set(registration, registrationLifetime);
    return registrationLifetime;
  }

  registerExtensions(
    descriptions: Iterable<WorkbenchExtensionDescription>,
  ): ExtensionRegistrationStore {
    const store = new ExtensionRegistrationStore();

    try {
      for (const description of descriptions) {
        store.addRegistration(description.manifest.id, this.registerExtension(description));
      }
      this.assertDependencyGraph();
    } catch (error) {
      store.dispose();
      throw error;
    }

    return store;
  }

  async activateByEvent(activationEvent: string): Promise<readonly ActivatedExtension[]> {
    return this.activationService.activateByEvent(activationEvent);
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
    return this.activationService.activate(extensionId);
  }

  async deactivateExtension(extensionId: string): Promise<void> {
    return this.activationService.deactivate(extensionId);
  }

  async deactivateAll(): Promise<void> {
    return this.activationService.deactivateAll();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    let firstError: unknown;
    let hasError = false;
    const disposables: readonly Disposable[] = [
      ...this.registrationLifetimes.values(),
      this.activationService,
      this.inventory,
      this.activities,
      this.commands,
      this.configurations,
      this.keybindings,
      this.localizations,
      this.menus,
      this.statusBar,
      this.themes,
      this.views,
      this.editors,
      this.editorDocumentViews,
      this.viewHostFactories,
      this.editorHostFactories,
      this.editorResolvers,
      this.capabilityRegistry,
    ];
    for (const disposable of disposables) {
      try {
        disposable.dispose();
      } catch (error) {
        if (!hasError) {
          firstError = error;
          hasError = true;
        }
      }
    }
    this.registrationLifetimes.clear();
    if (hasError) {
      throw firstError;
    }
  }

  private assertDependencyGraph(): void {
    for (const description of this.inventory.list()) {
      for (const dependencyId of description.manifest.extensionDependencies ?? []) {
        if (!this.inventory.get(dependencyId)) {
          throw new Error(
            `Extension "${description.manifest.id}" depends on missing extension "${dependencyId}".`,
          );
        }
      }
    }

    for (const description of this.inventory.list()) {
      this.assertNoDependencyCycle(description.manifest.id, []);
    }
  }

  private assertNoDependencyCycle(extensionId: string, path: string[]): void {
    if (path.includes(extensionId)) {
      throw new Error(
        `Extension dependency cycle detected: ${[...path, extensionId].join(' -> ')}`,
      );
    }

    const description = this.inventory.get(extensionId);
    if (!description) {
      return;
    }

    for (const dependencyId of description.manifest.extensionDependencies ?? []) {
      this.assertNoDependencyCycle(dependencyId, [...path, extensionId]);
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
