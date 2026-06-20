import { describe, expect, it } from 'vitest';

import {
  collectExtensionDependencyDiagnostics,
  ExtensionRegistry,
  type WorkbenchExtensionDescription,
} from './index.js';

const helloWorldExtension: WorkbenchExtensionDescription = {
  manifest: {
    schemaVersion: 1,
    id: 'workbench-kit.samples.hello-world',
    name: 'samples-hello-world',
    displayName: 'Hello World Sample',
    version: '0.0.0',
    publisher: 'workbench-kit',
    engines: {
      workbench: '^0.0.0',
      extensionApi: '^0.0.0',
    },
    activationEvents: ['onCommand:workbench-kit.samples.hello-world.sayHello'],
    contributes: {
      commands: [
        {
          command: 'workbench-kit.samples.hello-world.sayHello',
          title: 'Hello World: Say Hello',
        },
      ],
    },
  },
  module: {
    activate: (context) => {
      context.subscriptions.add({
        dispose() {},
      });
    },
  },
};

describe('ExtensionRegistry', () => {
  it('registers manifest command contributions', () => {
    const registry = new ExtensionRegistry();
    registry.registerExtension(helloWorldExtension);

    expect(
      registry.commands.getCommand('workbench-kit.samples.hello-world.sayHello'),
    ).toMatchObject({
      id: 'workbench-kit.samples.hello-world.sayHello',
      title: 'Hello World: Say Hello',
    });
  });

  it('hard-fails duplicate contributed command IDs', () => {
    const registry = new ExtensionRegistry();
    registry.registerExtension(helloWorldExtension);

    expect(() => registry.registerExtension(helloWorldExtension)).toThrow(
      'Extension "workbench-kit.samples.hello-world" is already registered.',
    );
    expect(() =>
      registry.registerExtension({
        manifest: {
          ...helloWorldExtension.manifest,
          id: 'workbench-kit.samples.duplicate',
        },
      }),
    ).toThrow('Command "workbench-kit.samples.hello-world.sayHello" is already registered.');
  });

  it('activates extensions by command activation event', async () => {
    const registry = new ExtensionRegistry();
    const activated: string[] = [];
    registry.registerExtension({
      ...helloWorldExtension,
      module: {
        activate: (context) => {
          activated.push(context.extensionId);
        },
      },
    });

    const result = await registry.activateCommand('workbench-kit.samples.hello-world.sayHello');

    expect(result.map((extension) => extension.extensionId)).toEqual([
      'workbench-kit.samples.hello-world',
    ]);
    expect(activated).toEqual(['workbench-kit.samples.hello-world']);
    expect(registry.isActive('workbench-kit.samples.hello-world')).toBe(true);
  });

  it('executes command handlers registered during activation', async () => {
    const registry = new ExtensionRegistry();
    registry.registerExtension({
      ...helloWorldExtension,
      module: {
        activate: (context) => {
          context.commands.registerCommand('workbench-kit.samples.hello-world.sayHello', () => {
            return `hello from ${context.extensionId}`;
          });
        },
      },
    });

    await expect(
      registry.executeCommand('workbench-kit.samples.hello-world.sayHello'),
    ).resolves.toBe('hello from workbench-kit.samples.hello-world');
  });

  it('registers view providers during view activation', async () => {
    const registry = new ExtensionRegistry();
    registry.registerExtension({
      manifest: {
        schemaVersion: 1,
        id: 'workbench-kit.builtin.explorer',
        name: 'builtin-explorer',
        displayName: 'Explorer',
        version: '0.0.0',
        publisher: 'workbench-kit',
        engines: {
          workbench: '^0.0.0',
          extensionApi: '^0.0.0',
        },
        activationEvents: ['onView:workbench-kit.builtin.explorer.tree'],
        contributes: {
          views: {
            explorer: [
              {
                id: 'workbench-kit.builtin.explorer.tree',
                name: 'Explorer',
              } as never,
            ],
          },
        },
      },
      module: {
        activate: (context) => {
          context.views.registerViewProvider({
            viewId: 'workbench-kit.builtin.explorer.tree',
            resolveViewHost: () => ({
              dispose() {},
              render: () => 'Explorer Tree',
            }),
          });
        },
      },
    });

    expect(registry.views.getViewProvider('workbench-kit.builtin.explorer.tree')).toBeUndefined();

    await registry.activateView('workbench-kit.builtin.explorer.tree');

    expect(
      registry.views
        .getViewProvider('workbench-kit.builtin.explorer.tree')
        ?.resolveViewHost()
        .render(),
    ).toBe('Explorer Tree');

    await registry.deactivateExtension('workbench-kit.builtin.explorer');

    expect(registry.views.getViewProvider('workbench-kit.builtin.explorer.tree')).toBeUndefined();
  });

  it('shares concurrent extension activation for the same activation event', async () => {
    const registry = new ExtensionRegistry();
    let activateCalls = 0;
    let resolveActivation: () => void = () => undefined;
    const activationGate = new Promise<void>((resolve) => {
      resolveActivation = resolve;
    });

    registry.registerExtension({
      manifest: {
        schemaVersion: 1,
        id: 'workbench-kit.builtin.explorer',
        name: 'builtin-explorer',
        displayName: 'Explorer',
        version: '0.0.0',
        publisher: 'workbench-kit',
        engines: {
          workbench: '^0.0.0',
          extensionApi: '^0.0.0',
        },
        activationEvents: ['onView:workbench-kit.builtin.explorer.tree'],
        contributes: {
          views: {
            explorer: [
              {
                id: 'workbench-kit.builtin.explorer.tree',
                name: 'Explorer',
              } as never,
            ],
          },
        },
      },
      module: {
        activate: async (context) => {
          activateCalls += 1;
          await activationGate;
          context.views.registerViewProvider({
            viewId: 'workbench-kit.builtin.explorer.tree',
            resolveViewHost: () => ({
              dispose() {},
              render: () => 'Explorer Tree',
            }),
          });
        },
      },
    });

    const firstActivation = registry.activateView('workbench-kit.builtin.explorer.tree');
    const secondActivation = registry.activateView('workbench-kit.builtin.explorer.tree');

    await Promise.resolve();
    expect(activateCalls).toBe(1);

    resolveActivation();
    await expect(Promise.all([firstActivation, secondActivation])).resolves.toHaveLength(2);
    expect(activateCalls).toBe(1);
    expect(registry.views.getViewProvider('workbench-kit.builtin.explorer.tree')).toBeDefined();
  });

  it('normalizes views, view containers, menus, activities, and configuration', () => {
    const registry = new ExtensionRegistry();
    registry.registerExtension({
      manifest: {
        schemaVersion: 1,
        id: 'workbench-kit.builtin.explorer',
        name: 'builtin-explorer',
        displayName: 'Explorer',
        version: '0.0.0',
        publisher: 'workbench-kit',
        engines: {
          workbench: '^0.0.0',
          extensionApi: '^0.0.0',
        },
        activationEvents: ['onView:workbench-kit.builtin.explorer.tree'],
        contributes: {
          activities: [
            {
              icon: 'files',
              id: 'workbench-kit.builtin.explorer.activity',
              title: 'Explorer',
              viewContainerId: 'explorer',
            },
          ],
          configuration: {} as never,
          menus: {
            'view/title': [
              {
                command: 'workbench-kit.builtin.explorer.refresh',
                group: 'navigation',
                order: 1,
              },
            ],
          } as never,
          viewContainers: {
            activitybar: [
              {
                icon: 'files',
                id: 'explorer',
                title: 'Explorer',
              },
            ],
          },
          views: {
            explorer: [
              {
                id: 'workbench-kit.builtin.explorer.tree',
                name: 'Explorer',
              } as never,
            ],
          },
        },
      },
    });

    expect(registry.views.getViewContainers('activitybar')).toEqual([
      {
        icon: 'files',
        id: 'explorer',
        location: 'activitybar',
        title: 'Explorer',
      },
    ]);
    expect(registry.views.getView('workbench-kit.builtin.explorer.tree')).toMatchObject({
      containerId: 'explorer',
      id: 'workbench-kit.builtin.explorer.tree',
      name: 'Explorer',
    });
    expect(registry.menus.getMenuItems('view/title')).toEqual([
      {
        command: 'workbench-kit.builtin.explorer.refresh',
        group: 'navigation',
        menu: 'view/title',
        order: 1,
      },
    ]);
    expect(
      registry.activities.getActivity('workbench-kit.builtin.explorer.activity'),
    ).toMatchObject({
      extensionId: 'workbench-kit.builtin.explorer',
      viewContainerId: 'explorer',
    });
    expect(registry.configurations.getConfiguration('workbench-kit.builtin.explorer')).toEqual({
      properties: {},
    });
  });

  it('activates dependencies before dependent extensions', async () => {
    const registry = new ExtensionRegistry();
    const activated: string[] = [];
    registry.registerExtensions([
      {
        manifest: {
          schemaVersion: 1,
          id: 'dependent',
          name: 'dependent',
          displayName: 'Dependent',
          version: '0.0.0',
          publisher: 'workbench-kit',
          engines: {
            workbench: '^0.0.0',
            extensionApi: '^0.0.0',
          },
          activationEvents: ['onStartup'],
          extensionDependencies: ['dependency'],
        },
        module: {
          activate: () => {
            activated.push('dependent');
          },
        },
      },
      {
        manifest: {
          schemaVersion: 1,
          id: 'dependency',
          name: 'dependency',
          displayName: 'Dependency',
          version: '0.0.0',
          publisher: 'workbench-kit',
          engines: {
            workbench: '^0.0.0',
            extensionApi: '^0.0.0',
          },
          activationEvents: [],
        },
        module: {
          activate: () => {
            activated.push('dependency');
          },
        },
      },
    ]);

    await registry.activateStartup();

    expect(activated).toEqual(['dependency', 'dependent']);
  });

  it('hard-fails missing extension dependencies and rolls back registration', () => {
    const registry = new ExtensionRegistry();

    expect(() =>
      registry.registerExtensions([
        {
          manifest: {
            schemaVersion: 1,
            id: 'dependent',
            name: 'dependent',
            displayName: 'Dependent',
            version: '0.0.0',
            publisher: 'workbench-kit',
            engines: {
              workbench: '^0.0.0',
              extensionApi: '^0.0.0',
            },
            activationEvents: ['onStartup'],
            extensionDependencies: ['missing'],
          },
          module: {
            activate: () => undefined,
          },
        },
      ]),
    ).toThrow('Extension "dependent" depends on missing extension "missing".');

    expect(registry.getExtensions()).toEqual([]);
  });

  it('hard-fails extension dependency cycles and rolls back registration', () => {
    const registry = new ExtensionRegistry();

    expect(() =>
      registry.registerExtensions([
        {
          manifest: {
            schemaVersion: 1,
            id: 'first',
            name: 'first',
            displayName: 'First',
            version: '0.0.0',
            publisher: 'workbench-kit',
            engines: {
              workbench: '^0.0.0',
              extensionApi: '^0.0.0',
            },
            activationEvents: ['onStartup'],
            extensionDependencies: ['second'],
          },
        },
        {
          manifest: {
            schemaVersion: 1,
            id: 'second',
            name: 'second',
            displayName: 'Second',
            version: '0.0.0',
            publisher: 'workbench-kit',
            engines: {
              workbench: '^0.0.0',
              extensionApi: '^0.0.0',
            },
            activationEvents: ['onStartup'],
            extensionDependencies: ['first'],
          },
        },
      ]),
    ).toThrow('Extension dependency cycle detected: first -> second -> first');

    expect(registry.getExtensions()).toEqual([]);
  });

  it('reports extension dependency diagnostics without blocking registration', () => {
    const registry = new ExtensionRegistry();
    registry.registerExtensions([
      {
        manifest: {
          schemaVersion: 1,
          id: 'workbench-kit.accounts',
          name: 'accounts',
          displayName: 'Accounts',
          version: '0.0.0',
          publisher: 'workbench-kit',
          engines: {
            workbench: '^0.0.0',
            extensionApi: '^0.0.0',
          },
          activationEvents: ['onStartup'],
          capabilities: {
            requires: ['workbench.auth'],
          },
          extensionOptionalDependencies: ['workbench-kit.optional-theme'],
        },
      },
      {
        manifest: {
          schemaVersion: 1,
          id: 'workbench-kit.orphan-command',
          name: 'orphan-command',
          displayName: 'Orphan Command',
          version: '0.0.0',
          publisher: 'workbench-kit',
          engines: {
            workbench: '^0.0.0',
            extensionApi: '^0.0.0',
          },
          activationEvents: [],
          contributes: {
            commands: [
              {
                command: 'workbench-kit.orphan-command.run',
                title: 'Run Orphan Command',
              },
            ],
          },
        },
      },
    ]);

    expect(
      registry
        .getDependencyDiagnostics()
        .map(({ capabilityId, commandId, dependencyId, kind, severity }) => ({
          capabilityId,
          commandId,
          dependencyId,
          kind,
          severity,
        })),
    ).toEqual([
      {
        capabilityId: undefined,
        commandId: undefined,
        dependencyId: 'workbench-kit.optional-theme',
        kind: 'missing-optional-extension-dependency',
        severity: 'warning',
      },
      {
        capabilityId: 'workbench.auth',
        commandId: undefined,
        dependencyId: undefined,
        kind: 'missing-capability',
        severity: 'error',
      },
      {
        capabilityId: undefined,
        commandId: 'workbench-kit.orphan-command.run',
        dependencyId: undefined,
        kind: 'command-activation-missing',
        severity: 'warning',
      },
    ]);
  });

  it('accepts required capabilities satisfied by the host or an extension provider', () => {
    expect(
      collectExtensionDependencyDiagnostics(
        [
          {
            manifest: {
              schemaVersion: 1,
              id: 'workbench-kit.consumer',
              name: 'consumer',
              displayName: 'Consumer',
              version: '0.0.0',
              publisher: 'workbench-kit',
              engines: {
                workbench: '^0.0.0',
                extensionApi: '^0.0.0',
              },
              activationEvents: [],
              capabilities: {
                requires: ['workbench.auth', 'workbench.workspace'],
              },
            },
          },
          {
            manifest: {
              schemaVersion: 1,
              id: 'workbench-kit.workspace-provider',
              name: 'workspace-provider',
              displayName: 'Workspace Provider',
              version: '0.0.0',
              publisher: 'workbench-kit',
              engines: {
                workbench: '^0.0.0',
                extensionApi: '^0.0.0',
              },
              activationEvents: ['onStartup'],
              capabilities: {
                provides: ['workbench.workspace'],
              },
            },
          },
        ],
        {
          hasCapability: (capabilityId) => capabilityId === 'workbench.auth',
        },
      ),
    ).toEqual([]);
  });

  it('resolves host-seeded capabilities through getCapability', async () => {
    const registry = new ExtensionRegistry({
      capabilities: {
        'workbench.auth': { id: 'host-auth' },
      },
    });
    registry.registerExtension({
      ...helloWorldExtension,
      manifest: {
        ...helloWorldExtension.manifest,
        activationEvents: ['onStartup'],
      },
      module: {
        activate: (context) => {
          expect(context.getCapability<{ id: string }>('workbench.auth')).toEqual({
            id: 'host-auth',
          });
        },
      },
    });

    await registry.activateStartup();
  });

  it('disposes extension-provided capabilities on deactivate', async () => {
    const registry = new ExtensionRegistry();
    let disposed = false;

    registry.registerExtension({
      manifest: {
        schemaVersion: 1,
        id: 'workbench-kit.capability-provider',
        name: 'capability-provider',
        displayName: 'Capability Provider',
        version: '0.0.0',
        publisher: 'workbench-kit',
        engines: {
          workbench: '^0.0.0',
          extensionApi: '^0.0.0',
        },
        activationEvents: ['onStartup'],
        capabilities: {
          provides: ['workbench.workspace'],
        },
      },
      module: {
        activate: (context) => {
          context.capabilities.registerProvider({
            id: 'workbench.workspace',
            get: () => ({ ready: true }),
            dispose: () => {
              disposed = true;
            },
          });
        },
      },
    });

    await registry.activateStartup();
    expect(registry.capabilityRegistry.get<{ ready: boolean }>('workbench.workspace')).toEqual({
      ready: true,
    });

    await registry.deactivateExtension('workbench-kit.capability-provider');

    expect(disposed).toBe(true);
    expect(registry.capabilityRegistry.has('workbench.workspace')).toBe(false);
  });

  it('disposes extension-provided view host factories on deactivate', async () => {
    const registry = new ExtensionRegistry();

    registry.registerExtension({
      manifest: {
        schemaVersion: 1,
        id: 'workbench-kit.view-host-factory',
        name: 'view-host-factory',
        displayName: 'View Host Factory',
        version: '0.0.0',
        publisher: 'workbench-kit',
        engines: {
          workbench: '^0.0.0',
          extensionApi: '^0.0.0',
        },
        activationEvents: ['onStartup'],
      },
      module: {
        activate: (context) => {
          context.viewHostFactories.registerFactory({
            id: 'workbench-kit.test.view-host-factory',
            priority: 100,
            canCreate: ({ viewId }) => viewId === 'workbench-kit.test.view',
            create: () => ({
              dispose() {},
              render: () => 'factory-host',
            }),
          });
        },
      },
    });

    await registry.activateStartup();
    expect(
      registry.viewHostFactories
        .getFactories()
        .some((factory) => factory.id === 'workbench-kit.test.view-host-factory'),
    ).toBe(true);

    await registry.deactivateExtension('workbench-kit.view-host-factory');

    expect(
      registry.viewHostFactories
        .getFactories()
        .some((factory) => factory.id === 'workbench-kit.test.view-host-factory'),
    ).toBe(false);
  });
});
