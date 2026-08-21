import { DisposableStore } from '@workbench-kit/base';
import { describe, expect, it } from 'vitest';

import { ExtensionActivationService } from './activation-service.js';
import { ExtensionApiFactory } from './api-factory.js';
import { ExtensionContributionRouter } from './contribution-router.js';
import { ExtensionInventory } from './inventory.js';
import { ExtensionRegistry, type WorkbenchExtensionDescription } from './registry.js';

function createExtension(
  id: string,
  module: WorkbenchExtensionDescription['module'] = {},
): WorkbenchExtensionDescription {
  return {
    manifest: {
      schemaVersion: 1,
      id,
      name: id,
      displayName: id,
      version: '0.0.0',
      publisher: 'workbench-kit',
      engines: {
        workbench: '^0.0.0',
        extensionApi: '^0.0.0',
      },
      activationEvents: ['onStartup'],
    },
    module,
  };
}

function createApiFactory(registry: ExtensionRegistry): ExtensionApiFactory {
  return new ExtensionApiFactory({
    capabilityRegistry: registry.capabilityRegistry,
    commands: registry.commands,
    editorDocumentViews: registry.editorDocumentViews,
    editorHostFactories: registry.editorHostFactories,
    editorResolvers: registry.editorResolvers,
    viewHostFactories: registry.viewHostFactories,
    views: registry.views,
  });
}

describe('extension runtime roles', () => {
  it('keeps duplicate identity and disposal semantics inside ExtensionInventory', () => {
    const inventory = new ExtensionInventory();
    const description = createExtension('workbench-kit.test.inventory');
    const registration = inventory.register(description);

    expect(inventory.get(description.manifest.id)).toBe(description);
    expect(inventory.list()).toEqual([description]);
    expect(() => inventory.register(description)).toThrow(
      'Extension "workbench-kit.test.inventory" is already registered.',
    );

    registration.dispose();
    expect(inventory.get(description.manifest.id)).toBeUndefined();
    expect(inventory.list()).toEqual([]);
  });

  it('routes declarative contributions without activating executable code', () => {
    const registries = new ExtensionRegistry();
    const router = new ExtensionContributionRouter({
      activities: registries.activities,
      commands: registries.commands,
      configurations: registries.configurations,
      editors: registries.editors,
      keybindings: registries.keybindings,
      localizations: registries.localizations,
      menus: registries.menus,
      statusBar: registries.statusBar,
      themes: registries.themes,
      views: registries.views,
    });
    let activateCalls = 0;
    const description = createExtension('workbench-kit.test.contributions', {
      activate: () => {
        activateCalls += 1;
      },
    });
    description.manifest.contributes = {
      commands: [
        {
          command: 'workbench-kit.test.contributions.run',
          title: 'Run contribution test',
        },
      ],
    };

    const contributions = router.registerManifestContributions(description);

    expect(registries.commands.getCommand('workbench-kit.test.contributions.run')).toBeDefined();
    expect(activateCalls).toBe(0);

    contributions.dispose();
    expect(registries.commands.getCommand('workbench-kit.test.contributions.run')).toBeUndefined();
    registries.dispose();
  });

  it('creates the restricted context through ExtensionApiFactory', () => {
    const registries = new ExtensionRegistry();
    const apiFactory = createApiFactory(registries);
    const subscriptions = new DisposableStore();
    registries.capabilityRegistry.registerValue('workbench.test.context', { ready: true });
    const description = createExtension('workbench-kit.test.api-factory');
    description.extensionPath = '/extensions/api-factory';
    description.manifest.capabilities = { requires: ['workbench.test.context'] };

    const context = apiFactory.createContext(description, subscriptions);

    expect(context.extensionId).toBe(description.manifest.id);
    expect(context.extensionPath).toBe('/extensions/api-factory');
    expect(context.getCapability('workbench.test.context')).toEqual({ ready: true });
    expect('services' in context).toBe(false);
    expect('host' in context).toBe(false);

    subscriptions.dispose();
    registries.dispose();
  });

  it('owns activation state and lifecycle events in ExtensionActivationService', async () => {
    const registries = new ExtensionRegistry();
    const inventory = new ExtensionInventory();
    const events: string[] = [];
    const service = new ExtensionActivationService(inventory, createApiFactory(registries));
    const description = createExtension('workbench-kit.test.activation-service', {
      activate: () => {
        events.push('activate');
      },
      deactivate: () => {
        events.push('deactivate');
      },
    });
    inventory.register(description);
    service.onDidActivateExtension(() => events.push('did-activate'));
    service.onDidDeactivateExtension(() => events.push('did-deactivate'));

    await service.activate(description.manifest.id);
    expect(service.isActive(description.manifest.id)).toBe(true);

    await service.deactivate(description.manifest.id);
    expect(service.isActive(description.manifest.id)).toBe(false);
    expect(events).toEqual(['activate', 'did-activate', 'deactivate', 'did-deactivate']);

    service.dispose();
    inventory.dispose();
    registries.dispose();
  });

  it('does not let a stale invalidated epoch overwrite a newer successful state', async () => {
    const registries = new ExtensionRegistry();
    const inventory = new ExtensionInventory();
    const service = new ExtensionActivationService(inventory, createApiFactory(registries));
    let releaseOldActivation: () => void = () => undefined;
    let signalOldActivationStarted: () => void = () => undefined;
    const oldActivationGate = new Promise<void>((resolve) => {
      releaseOldActivation = resolve;
    });
    const oldActivationStarted = new Promise<void>((resolve) => {
      signalOldActivationStarted = resolve;
    });
    const extensionId = 'workbench-kit.test.stale-activation-failure';
    const oldInventoryRegistration = inventory.register(
      createExtension(extensionId, {
        activate: async () => {
          signalOldActivationStarted();
          await oldActivationGate;
          throw new Error('old activation failed');
        },
      }),
    );
    const oldRegistration = inventory.getRegistration(extensionId);
    if (!oldRegistration) {
      throw new Error('Expected old registration.');
    }

    const oldActivation = service.activate(extensionId);
    await oldActivationStarted;
    service.invalidateRegistration(extensionId, oldRegistration);
    oldInventoryRegistration.dispose();
    inventory.register(createExtension(extensionId));

    await service.activate(extensionId);
    expect(service.isActive(extensionId)).toBe(true);
    expect(service.getActivationFailure(extensionId)).toBeUndefined();

    releaseOldActivation();
    await expect(oldActivation).rejects.toThrow('old activation failed');
    expect(service.isActive(extensionId)).toBe(true);
    expect(service.getActivationFailure(extensionId)).toBeUndefined();

    await service.deactivate(extensionId);
    service.dispose();
    inventory.dispose();
    registries.dispose();
  });
});
