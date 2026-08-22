import { toDisposable, type Disposable, type DisposableStore } from '@workbench-kit/base';
import type { CommandRegistry, CommandServiceHandler } from '@workbench-kit/platform';
import type { ExtensionContext } from '@workbench-kit/workbench-extension-sdk';

import type { CapabilityRegistry, CapabilityProvider } from '../capability/registry.js';
import type { EditorDocumentViewProviderRegistry } from '../editor/document-view-registry.js';
import type { EditorResolverRegistry } from '../editor/resolver-registry.js';
import type {
  EditorHostFactoryRegistry,
  ViewHostFactoryRegistry,
} from '../host/factory-registry.js';
import type { ViewRegistry } from '../contributions/registries.js';
import { assertCapabilityAccess } from './permissions.js';
import type { WorkbenchExtensionDescription } from './registry.js';

export interface ExtensionApiFactoryOptions {
  capabilityRegistry: CapabilityRegistry;
  commands: CommandRegistry;
  editorDocumentViews: EditorDocumentViewProviderRegistry;
  editorHostFactories: EditorHostFactoryRegistry;
  editorResolvers: EditorResolverRegistry;
  viewHostFactories: ViewHostFactoryRegistry;
  views: ViewRegistry;
}

export class ExtensionApiFactory {
  constructor(private readonly options: ExtensionApiFactoryOptions) {}

  createContext(
    description: WorkbenchExtensionDescription,
    subscriptions: DisposableStore,
  ): ExtensionContext {
    return {
      capabilities: {
        registerProvider: <T>(provider: CapabilityProvider<T>) =>
          subscriptions.add(this.options.capabilityRegistry.register(provider)),
      },
      commands: {
        registerCommand: (commandId, handler) =>
          subscriptions.add(this.registerCommandHandler(commandId, handler)),
      },
      editorDocumentViews: {
        registerProvider: (provider) =>
          subscriptions.add(this.options.editorDocumentViews.registerProvider(provider)),
      },
      editorHostFactories: {
        registerFactory: (factory) =>
          subscriptions.add(this.options.editorHostFactories.register(factory)),
      },
      editorResolvers: {
        registerResolver: (resolver) =>
          subscriptions.add(this.options.editorResolvers.register(resolver)),
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
        return this.options.capabilityRegistry.get<T>(capabilityId);
      },
      permissions: [...(description.manifest.permissions ?? [])],
      requiredCapabilities: [...(description.manifest.capabilities?.requires ?? [])],
      subscriptions,
      viewHostFactories: {
        registerFactory: (factory) =>
          subscriptions.add(this.options.viewHostFactories.register(factory)),
      },
      views: {
        registerViewProvider: (provider) =>
          subscriptions.add(this.options.views.registerViewProvider(provider)),
      },
    };
  }

  private registerCommandHandler(commandId: string, handler: CommandServiceHandler): Disposable {
    const command = this.options.commands.getCommand(commandId);
    if (!command) {
      return this.options.commands.registerCommand({
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
}
