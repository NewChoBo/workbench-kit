import { describe, expect, it } from 'vitest';

import {
  collectExtensionDependencyDiagnostics,
  ExtensionRegistry,
  type WorkbenchExtensionDescription,
} from '../index.js';

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

function createTestExtension(
  id: string,
  module: WorkbenchExtensionDescription['module'],
  options: {
    readonly extensionDependencies?: readonly string[];
    readonly activationEvents?: readonly string[];
  } = {},
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
      activationEvents: [...(options.activationEvents ?? ['onStartup'])],
      ...(options.extensionDependencies
        ? { extensionDependencies: [...options.extensionDependencies] }
        : {}),
    },
    module,
  };
}

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

  it('retains focused registration handles without changing batch disposal', () => {
    const registry = new ExtensionRegistry();
    const registrations = registry.registerExtensions([helloWorldExtension]);

    expect(registrations.getRegistration(helloWorldExtension.manifest.id)).toBeDefined();
    expect(registrations.isDisposed).toBe(false);
    registrations.getRegistration(helloWorldExtension.manifest.id)?.dispose();
    expect(registry.getExtension(helloWorldExtension.manifest.id)).toBeUndefined();

    registrations.dispose();
    expect(registrations.isDisposed).toBe(true);
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

  it('emits extension lifecycle events when extensions activate and deactivate', async () => {
    const registry = new ExtensionRegistry();
    const events: string[] = [];
    const activateDisposable = registry.onDidActivateExtension((event) => {
      events.push(`activate:${event.extensionId}`);
    });
    const deactivateDisposable = registry.onDidDeactivateExtension((event) => {
      events.push(`deactivate:${event.extensionId}`);
    });

    registry.registerExtension(helloWorldExtension);

    await registry.activateCommand('workbench-kit.samples.hello-world.sayHello');
    await registry.deactivateExtension('workbench-kit.samples.hello-world');

    expect(events).toEqual([
      'activate:workbench-kit.samples.hello-world',
      'deactivate:workbench-kit.samples.hello-world',
    ]);

    activateDisposable.dispose();
    deactivateDisposable.dispose();
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

  it('registers editor document view providers during extension activation', async () => {
    const registry = new ExtensionRegistry();
    registry.registerExtension({
      manifest: {
        schemaVersion: 1,
        id: 'workbench-kit.samples.document-view',
        name: 'samples-document-view',
        displayName: 'Document View',
        version: '0.0.0',
        publisher: 'workbench-kit',
        engines: {
          workbench: '^0.0.0',
          extensionApi: '^0.0.0',
        },
        activationEvents: ['onStartup'],
        contributes: {
          documentViews: [
            {
              filenamePatterns: ['*.preview.json'],
              id: 'workbench-kit.samples.document-view.preview',
              kind: 'preview',
              label: 'Preview',
            },
          ],
        },
      },
      module: {
        activate: (context) => {
          context.editorDocumentViews.registerProvider({
            filenamePatterns: ['*.preview.json'],
            id: 'workbench-kit.samples.document-view.preview',
            kind: 'preview',
            label: 'Preview',
            render: ({ document }) => `Preview ${document.path}`,
          });
        },
      },
    });

    expect(registry.editorDocumentViews.getProviders()).toHaveLength(0);

    await registry.activateStartup();

    expect(registry.editorDocumentViews.getProviders()).toHaveLength(1);
    expect(
      registry.editorDocumentViews.getProviders()[0]?.render({
        document: {
          content: '{}',
          path: 'sample.preview.json',
          resourceUri: 'workspace://file/sample.preview.json',
        },
        onContentChange: () => undefined,
      }),
    ).toBe('Preview sample.preview.json');

    await registry.deactivateExtension('workbench-kit.samples.document-view');

    expect(registry.editorDocumentViews.getProviders()).toHaveLength(0);
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

  it.each([
    {
      activationEvent: 'onStartup',
      name: 'explicit activation',
      trigger: (registry: ExtensionRegistry, extensionId: string) =>
        registry.activateExtension(extensionId),
    },
    {
      activationEvent: 'onStartup',
      name: 'startup activation',
      trigger: (registry: ExtensionRegistry) => registry.activateStartup(),
    },
    {
      activationEvent: 'onCommand:workbench-kit.test.barrier-command.run',
      name: 'command activation',
      trigger: (registry: ExtensionRegistry) =>
        registry.activateCommand('workbench-kit.test.barrier-command.run'),
    },
    {
      activationEvent: 'onView:workbench-kit.test.barrier-view',
      name: 'view activation',
      trigger: (registry: ExtensionRegistry) =>
        registry.activateView('workbench-kit.test.barrier-view'),
    },
  ])('waits for prior teardown before $name', async ({ activationEvent, name, trigger }) => {
    const registry = new ExtensionRegistry();
    const extensionId = `workbench-kit.test.${name.replaceAll(' ', '-')}`;
    let activateCalls = 0;
    let resolveTeardown: () => void = () => undefined;
    const teardownGate = new Promise<void>((resolve) => {
      resolveTeardown = resolve;
    });
    registry.registerExtension(
      createTestExtension(
        extensionId,
        {
          activate: () => {
            activateCalls += 1;
          },
          deactivate: async () => {
            await teardownGate;
          },
        },
        { activationEvents: [activationEvent] },
      ),
    );

    await registry.activateExtension(extensionId);
    const deactivation = registry.deactivateExtension(extensionId);
    expect(registry.isActive(extensionId)).toBe(false);

    const reactivation = trigger(registry, extensionId);
    await Promise.resolve();
    expect(activateCalls).toBe(1);

    resolveTeardown();
    await deactivation;
    await reactivation;
    expect(activateCalls).toBe(2);
  });

  it('waits for a dependency teardown before activating the dependency and dependent', async () => {
    const registry = new ExtensionRegistry();
    const activations: string[] = [];
    let resolveTeardown: () => void = () => undefined;
    const teardownGate = new Promise<void>((resolve) => {
      resolveTeardown = resolve;
    });
    registry.registerExtensions([
      createTestExtension('workbench-kit.test.barrier-dependency', {
        activate: () => {
          activations.push('dependency');
        },
        deactivate: async () => {
          await teardownGate;
        },
      }),
      createTestExtension(
        'workbench-kit.test.barrier-dependent',
        {
          activate: () => {
            activations.push('dependent');
          },
        },
        { extensionDependencies: ['workbench-kit.test.barrier-dependency'] },
      ),
    ]);

    await registry.activateExtension('workbench-kit.test.barrier-dependency');
    const deactivation = registry.deactivateExtension('workbench-kit.test.barrier-dependency');
    const dependentActivation = registry.activateExtension('workbench-kit.test.barrier-dependent');
    await Promise.resolve();

    expect(activations).toEqual(['dependency']);

    resolveTeardown();
    await deactivation;
    await dependentActivation;
    expect(activations).toEqual(['dependency', 'dependency', 'dependent']);
  });

  it('shares teardown requested while activation is still in flight', async () => {
    const registry = new ExtensionRegistry();
    let deactivateCalls = 0;
    let resolveActivation: () => void = () => undefined;
    let resolveTeardown: () => void = () => undefined;
    const activationGate = new Promise<void>((resolve) => {
      resolveActivation = resolve;
    });
    const teardownGate = new Promise<void>((resolve) => {
      resolveTeardown = resolve;
    });
    registry.registerExtension(
      createTestExtension('workbench-kit.test.pending-deactivation', {
        activate: async () => {
          await activationGate;
        },
        deactivate: async () => {
          deactivateCalls += 1;
          await teardownGate;
        },
      }),
    );

    const activation = registry.activateExtension('workbench-kit.test.pending-deactivation');
    const firstDeactivation = registry.deactivateExtension(
      'workbench-kit.test.pending-deactivation',
    );
    const secondDeactivation = registry.deactivateExtension(
      'workbench-kit.test.pending-deactivation',
    );
    let firstCompleted = false;
    void firstDeactivation.then(() => {
      firstCompleted = true;
    });

    resolveActivation();
    await activation;
    await Promise.resolve();
    expect(deactivateCalls).toBe(1);
    expect(firstCompleted).toBe(false);

    resolveTeardown();
    await Promise.all([firstDeactivation, secondDeactivation]);
    expect(deactivateCalls).toBe(1);
    expect(registry.isActive('workbench-kit.test.pending-deactivation')).toBe(false);
  });

  it('cleans up a failed teardown before allowing an explicit retry', async () => {
    const registry = new ExtensionRegistry();
    const events: string[] = [];
    let activateCalls = 0;
    let disposeCalls = 0;
    let failTeardown = true;
    registry.onDidDeactivateExtension(({ extensionId }) => {
      events.push(`deactivate:${extensionId}`);
    });
    registry.registerExtension(
      createTestExtension('workbench-kit.test.teardown-failure', {
        activate: (context) => {
          activateCalls += 1;
          context.subscriptions.add({
            dispose: () => {
              disposeCalls += 1;
            },
          });
        },
        deactivate: () => {
          if (failTeardown) {
            failTeardown = false;
            throw new Error('teardown failed');
          }
        },
      }),
    );

    await registry.activateExtension('workbench-kit.test.teardown-failure');
    await expect(
      registry.deactivateExtension('workbench-kit.test.teardown-failure'),
    ).rejects.toThrow('teardown failed');

    expect(registry.isActive('workbench-kit.test.teardown-failure')).toBe(false);
    expect(disposeCalls).toBe(1);
    expect(events).toEqual(['deactivate:workbench-kit.test.teardown-failure']);

    await registry.activateExtension('workbench-kit.test.teardown-failure');
    expect(activateCalls).toBe(2);
    expect(registry.isActive('workbench-kit.test.teardown-failure')).toBe(true);
  });

  it('keeps activation failure scoped to one retryable epoch', async () => {
    const registry = new ExtensionRegistry();
    let activateCalls = 0;
    let disposeCalls = 0;
    registry.registerExtension(
      createTestExtension('workbench-kit.test.activation-failure', {
        activate: (context) => {
          activateCalls += 1;
          context.subscriptions.add({
            dispose: () => {
              disposeCalls += 1;
            },
          });
          if (activateCalls === 1) {
            throw new Error('activation failed');
          }
        },
      }),
    );

    await expect(
      registry.activateExtension('workbench-kit.test.activation-failure'),
    ).rejects.toThrow('activation failed');
    expect(registry.isActive('workbench-kit.test.activation-failure')).toBe(false);
    expect(disposeCalls).toBe(1);

    await registry.activateExtension('workbench-kit.test.activation-failure');
    expect(activateCalls).toBe(2);
    expect(registry.isActive('workbench-kit.test.activation-failure')).toBe(true);
  });

  it('exhausts throwing scope disposal before releasing teardown for retry', async () => {
    const registry = new ExtensionRegistry();
    const disposals: string[] = [];
    const events: string[] = [];
    let activateCalls = 0;
    registry.onDidDeactivateExtension(() => {
      events.push('did-deactivate');
    });
    registry.registerExtension(
      createTestExtension('workbench-kit.test.throwing-scope-disposal', {
        activate: (context) => {
          activateCalls += 1;
          if (activateCalls !== 1) {
            return;
          }
          context.subscriptions.add({
            dispose: () => {
              disposals.push('first');
            },
          });
          context.subscriptions.add({
            dispose: () => {
              disposals.push('throwing');
              throw new Error('scope disposal failed');
            },
          });
          context.subscriptions.add({
            dispose: () => {
              disposals.push('last');
            },
          });
        },
      }),
    );

    await registry.activateExtension('workbench-kit.test.throwing-scope-disposal');
    await expect(
      registry.deactivateExtension('workbench-kit.test.throwing-scope-disposal'),
    ).rejects.toThrow('scope disposal failed');

    expect(disposals).toEqual(['last', 'throwing', 'first']);
    expect(events).toEqual(['did-deactivate']);
    expect(registry.isActive('workbench-kit.test.throwing-scope-disposal')).toBe(false);

    await registry.activateExtension('workbench-kit.test.throwing-scope-disposal');
    expect(activateCalls).toBe(2);
    expect(registry.isActive('workbench-kit.test.throwing-scope-disposal')).toBe(true);
  });

  it('isolates lifecycle listener failures from activation and deactivation state', async () => {
    const registry = new ExtensionRegistry();
    const events: string[] = [];
    registry.onDidActivateExtension(() => {
      throw new Error('activation listener failed');
    });
    registry.onDidActivateExtension(() => {
      events.push('did-activate');
    });
    registry.onDidDeactivateExtension(() => {
      throw new Error('deactivation listener failed');
    });
    registry.onDidDeactivateExtension(() => {
      events.push('did-deactivate');
    });
    registry.registerExtension(createTestExtension('workbench-kit.test.listener-failure', {}));

    await expect(
      registry.activateExtension('workbench-kit.test.listener-failure'),
    ).resolves.toBeDefined();
    expect(registry.isActive('workbench-kit.test.listener-failure')).toBe(true);

    await expect(
      registry.deactivateExtension('workbench-kit.test.listener-failure'),
    ).resolves.toBeUndefined();
    expect(registry.isActive('workbench-kit.test.listener-failure')).toBe(false);
    expect(events).toEqual(['did-activate', 'did-deactivate']);
  });

  it('suppresses lifecycle events after synchronous facade disposal', async () => {
    const registry = new ExtensionRegistry();
    const events: string[] = [];
    let resolveScopeDisposed: () => void = () => undefined;
    let resolveTeardown: () => void = () => undefined;
    const scopeDisposed = new Promise<void>((resolve) => {
      resolveScopeDisposed = resolve;
    });
    const teardownGate = new Promise<void>((resolve) => {
      resolveTeardown = resolve;
    });
    registry.onDidDeactivateExtension(() => {
      events.push('before-dispose-listener');
    });
    registry.registerExtension(
      createTestExtension('workbench-kit.test.dispose-events', {
        activate: (context) => {
          context.subscriptions.add({ dispose: resolveScopeDisposed });
        },
        deactivate: async () => {
          await teardownGate;
        },
      }),
    );
    await registry.activateExtension('workbench-kit.test.dispose-events');

    registry.dispose();
    registry.onDidDeactivateExtension(() => {
      events.push('after-dispose-listener');
    });
    resolveTeardown();
    await scopeDisposed;
    await Promise.resolve();

    expect(events).toEqual([]);
  });

  it('finishes the old scope and deactivation event before exposing a new epoch', async () => {
    const registry = new ExtensionRegistry();
    const sequence: string[] = [];
    let activationEpoch = 0;
    let resolveTeardown: () => void = () => undefined;
    const teardownGate = new Promise<void>((resolve) => {
      resolveTeardown = resolve;
    });
    registry.onDidActivateExtension(() => {
      sequence.push(`did-activate:${activationEpoch}`);
    });
    registry.onDidDeactivateExtension(() => {
      sequence.push('did-deactivate:1');
    });
    registry.registerExtension(
      createTestExtension('workbench-kit.test.epoch-order', {
        activate: (context) => {
          activationEpoch += 1;
          const currentEpoch = activationEpoch;
          sequence.push(`activate:${currentEpoch}`);
          context.subscriptions.add({
            dispose: () => {
              sequence.push(`dispose:${currentEpoch}`);
            },
          });
        },
        deactivate: async () => {
          sequence.push('deactivate:start:1');
          await teardownGate;
          sequence.push('deactivate:end:1');
        },
      }),
    );

    await registry.activateExtension('workbench-kit.test.epoch-order');
    const deactivation = registry.deactivateExtension('workbench-kit.test.epoch-order');
    const reactivation = registry.activateExtension('workbench-kit.test.epoch-order');

    resolveTeardown();
    await deactivation;
    await reactivation;

    expect(sequence).toEqual([
      'activate:1',
      'did-activate:1',
      'deactivate:start:1',
      'deactivate:end:1',
      'dispose:1',
      'did-deactivate:1',
      'activate:2',
      'did-activate:2',
    ]);
    expect(registry.isActive('workbench-kit.test.epoch-order')).toBe(true);
  });

  it('does not activate a dependent after it is unregistered while awaiting a dependency', async () => {
    const registry = new ExtensionRegistry();
    const activationEvents: string[] = [];
    let dependentActivateCalls = 0;
    let resolveDependency: () => void = () => undefined;
    let signalDependencyStarted: () => void = () => undefined;
    const dependencyGate = new Promise<void>((resolve) => {
      resolveDependency = resolve;
    });
    const dependencyStarted = new Promise<void>((resolve) => {
      signalDependencyStarted = resolve;
    });

    registry.onDidActivateExtension((event) => activationEvents.push(event.extensionId));
    const dependentRegistration = registry.registerExtension(
      createTestExtension(
        'workbench-kit.test.dependent',
        {
          activate: () => {
            dependentActivateCalls += 1;
          },
        },
        { extensionDependencies: ['workbench-kit.test.dependency'] },
      ),
    );
    registry.registerExtension(
      createTestExtension('workbench-kit.test.dependency', {
        activate: async () => {
          signalDependencyStarted();
          await dependencyGate;
        },
      }),
    );

    const activation = registry.activateExtension('workbench-kit.test.dependent');
    await dependencyStarted;
    dependentRegistration.dispose();
    resolveDependency();

    await expect(activation).rejects.toThrow(
      'Extension "workbench-kit.test.dependent" activation was invalidated.',
    );
    expect(dependentActivateCalls).toBe(0);
    expect(registry.isActive('workbench-kit.test.dependent')).toBe(false);
    expect(activationEvents).toEqual(['workbench-kit.test.dependency']);
  });

  it('does not activate later dependencies after unregistering a dependent that awaits one', async () => {
    const registry = new ExtensionRegistry();
    const activationEvents: string[] = [];
    let laterDependencyActivateCalls = 0;
    let resolveFirstDependency: () => void = () => undefined;
    let signalFirstDependencyStarted: () => void = () => undefined;
    const firstDependencyGate = new Promise<void>((resolve) => {
      resolveFirstDependency = resolve;
    });
    const firstDependencyStarted = new Promise<void>((resolve) => {
      signalFirstDependencyStarted = resolve;
    });

    registry.onDidActivateExtension((event) => activationEvents.push(event.extensionId));
    const parentRegistration = registry.registerExtension(
      createTestExtension(
        'workbench-kit.test.two-dependency-parent',
        { activate: () => undefined },
        {
          extensionDependencies: [
            'workbench-kit.test.first-dependency',
            'workbench-kit.test.later-dependency',
          ],
        },
      ),
    );
    registry.registerExtension(
      createTestExtension('workbench-kit.test.first-dependency', {
        activate: async () => {
          signalFirstDependencyStarted();
          await firstDependencyGate;
        },
      }),
    );
    registry.registerExtension(
      createTestExtension('workbench-kit.test.later-dependency', {
        activate: () => {
          laterDependencyActivateCalls += 1;
        },
      }),
    );

    const activation = registry.activateExtension('workbench-kit.test.two-dependency-parent');
    await firstDependencyStarted;
    parentRegistration.dispose();
    resolveFirstDependency();

    await expect(activation).rejects.toThrow(
      'Extension "workbench-kit.test.two-dependency-parent" activation was invalidated.',
    );
    expect(laterDependencyActivateCalls).toBe(0);
    expect(registry.isActive('workbench-kit.test.later-dependency')).toBe(false);
    expect(activationEvents).toEqual(['workbench-kit.test.first-dependency']);
  });

  it('does not activate a dependent after registry disposal while awaiting a dependency', async () => {
    const registry = new ExtensionRegistry();
    let dependentActivateCalls = 0;
    let resolveDependency: () => void = () => undefined;
    let signalDependencyStarted: () => void = () => undefined;
    const dependencyGate = new Promise<void>((resolve) => {
      resolveDependency = resolve;
    });
    const dependencyStarted = new Promise<void>((resolve) => {
      signalDependencyStarted = resolve;
    });

    registry.registerExtension(
      createTestExtension(
        'workbench-kit.test.dispose-dependent',
        {
          activate: () => {
            dependentActivateCalls += 1;
          },
        },
        { extensionDependencies: ['workbench-kit.test.dispose-dependency'] },
      ),
    );
    registry.registerExtension(
      createTestExtension('workbench-kit.test.dispose-dependency', {
        activate: async () => {
          signalDependencyStarted();
          await dependencyGate;
        },
      }),
    );

    const activation = registry.activateExtension('workbench-kit.test.dispose-dependent');
    await dependencyStarted;
    registry.dispose();
    resolveDependency();

    await expect(activation).rejects.toThrow(
      'Extension "workbench-kit.test.dispose-dependency" activation was invalidated.',
    );
    expect(dependentActivateCalls).toBe(0);
    expect(registry.isActive('workbench-kit.test.dispose-dependent')).toBe(false);
  });

  it('disposes pending activation subscriptions when an extension is unregistered', async () => {
    const registry = new ExtensionRegistry();
    const activationEvents: string[] = [];
    let deactivateCalls = 0;
    let earlySubscriptionDisposals = 0;
    let lateSubscriptionDisposals = 0;
    let resolveActivation: () => void = () => undefined;
    let signalActivationStarted: () => void = () => undefined;
    const activationGate = new Promise<void>((resolve) => {
      resolveActivation = resolve;
    });
    const activationStarted = new Promise<void>((resolve) => {
      signalActivationStarted = resolve;
    });

    registry.onDidActivateExtension((event) => activationEvents.push(event.extensionId));
    const registration = registry.registerExtension(
      createTestExtension('workbench-kit.test.pending-unregister', {
        activate: async (context) => {
          context.subscriptions.add({
            dispose: () => {
              earlySubscriptionDisposals += 1;
            },
          });
          signalActivationStarted();
          await activationGate;
          context.subscriptions.add({
            dispose: () => {
              lateSubscriptionDisposals += 1;
            },
          });
        },
        deactivate: () => {
          deactivateCalls += 1;
        },
      }),
    );

    const activation = registry.activateExtension('workbench-kit.test.pending-unregister');
    await activationStarted;
    registration.dispose();

    expect(earlySubscriptionDisposals).toBe(1);
    resolveActivation();

    await expect(activation).rejects.toThrow(
      'Extension "workbench-kit.test.pending-unregister" activation was invalidated.',
    );
    expect(lateSubscriptionDisposals).toBe(1);
    expect(deactivateCalls).toBe(0);
    expect(registry.isActive('workbench-kit.test.pending-unregister')).toBe(false);
    expect(activationEvents).toEqual([]);
  });

  it('finishes pending invalidation when an activation subscription throws on disposal', async () => {
    const registry = new ExtensionRegistry();
    const disposals: string[] = [];
    let resolveActivation: () => void = () => undefined;
    let signalActivationStarted: () => void = () => undefined;
    const activationGate = new Promise<void>((resolve) => {
      resolveActivation = resolve;
    });
    const activationStarted = new Promise<void>((resolve) => {
      signalActivationStarted = resolve;
    });
    const registration = registry.registerExtension(
      createTestExtension('workbench-kit.test.pending-throwing-disposal', {
        activate: async (context) => {
          context.subscriptions.add({
            dispose: () => {
              disposals.push('first');
            },
          });
          context.subscriptions.add({
            dispose: () => {
              disposals.push('throwing');
              throw new Error('pending disposal failed');
            },
          });
          signalActivationStarted();
          await activationGate;
        },
      }),
    );

    const activation = registry.activateExtension('workbench-kit.test.pending-throwing-disposal');
    await activationStarted;

    expect(() => registration.dispose()).not.toThrow();
    expect(registry.getExtension('workbench-kit.test.pending-throwing-disposal')).toBeUndefined();
    expect(disposals).toEqual(['throwing', 'first']);

    resolveActivation();
    await expect(activation).rejects.toThrow(
      'Extension "workbench-kit.test.pending-throwing-disposal" activation was invalidated.',
    );
    expect(registry.isActive('workbench-kit.test.pending-throwing-disposal')).toBe(false);
  });

  it('exhausts registry disposal across throwing pending activation scopes', async () => {
    const registry = new ExtensionRegistry();
    const disposals: string[] = [];
    const activationResolvers = new Map<string, () => void>();
    const activationStarts = new Map<string, Promise<void>>();
    const activationStartResolvers = new Map<string, () => void>();
    const extensionIds = [
      'workbench-kit.test.dispose-pending-first',
      'workbench-kit.test.dispose-pending-second',
    ];

    for (const extensionId of extensionIds) {
      activationStarts.set(
        extensionId,
        new Promise<void>((resolve) => {
          activationStartResolvers.set(extensionId, resolve);
        }),
      );
      const activationGate = new Promise<void>((resolve) => {
        activationResolvers.set(extensionId, resolve);
      });
      registry.registerExtension(
        createTestExtension(extensionId, {
          activate: async (context) => {
            context.subscriptions.add({
              dispose: () => {
                disposals.push(extensionId);
                throw new Error(`dispose failed: ${extensionId}`);
              },
            });
            activationStartResolvers.get(extensionId)?.();
            await activationGate;
          },
        }),
      );
    }

    const activations = extensionIds.map((extensionId) => registry.activateExtension(extensionId));
    await Promise.all(extensionIds.map((extensionId) => activationStarts.get(extensionId)));

    expect(() => registry.dispose()).not.toThrow();
    expect(registry.getExtensions()).toEqual([]);
    expect(disposals).toEqual(extensionIds);

    for (const extensionId of extensionIds) {
      activationResolvers.get(extensionId)?.();
    }
    const results = await Promise.allSettled(activations);
    expect(results.map(({ status }) => status)).toEqual(['rejected', 'rejected']);
  });

  it('keeps a re-registered extension isolated from an invalidated pending generation', async () => {
    const registry = new ExtensionRegistry();
    let newActivationCalls = 0;
    let oldActivationCalls = 0;
    let resolveDependency: () => void = () => undefined;
    let resolveNewActivation: () => void = () => undefined;
    let signalDependencyStarted: () => void = () => undefined;
    let signalNewActivationStarted: () => void = () => undefined;
    const dependencyGate = new Promise<void>((resolve) => {
      resolveDependency = resolve;
    });
    const newActivationGate = new Promise<void>((resolve) => {
      resolveNewActivation = resolve;
    });
    const dependencyStarted = new Promise<void>((resolve) => {
      signalDependencyStarted = resolve;
    });
    const newActivationStarted = new Promise<void>((resolve) => {
      signalNewActivationStarted = resolve;
    });

    const oldRegistration = registry.registerExtension(
      createTestExtension(
        'workbench-kit.test.re-register',
        {
          activate: () => {
            oldActivationCalls += 1;
          },
        },
        { extensionDependencies: ['workbench-kit.test.re-register-dependency'] },
      ),
    );
    registry.registerExtension(
      createTestExtension('workbench-kit.test.re-register-dependency', {
        activate: async () => {
          signalDependencyStarted();
          await dependencyGate;
        },
      }),
    );

    const oldActivation = registry.activateExtension('workbench-kit.test.re-register');
    await dependencyStarted;
    oldRegistration.dispose();

    registry.registerExtension(
      createTestExtension('workbench-kit.test.re-register', {
        activate: async () => {
          newActivationCalls += 1;
          signalNewActivationStarted();
          await newActivationGate;
        },
      }),
    );
    const newActivation = registry.activateExtension('workbench-kit.test.re-register');
    await newActivationStarted;

    resolveDependency();
    await expect(oldActivation).rejects.toThrow(
      'Extension "workbench-kit.test.re-register" activation was invalidated.',
    );

    const concurrentNewActivation = registry.activateExtension('workbench-kit.test.re-register');
    expect(newActivationCalls).toBe(1);
    resolveNewActivation();

    await expect(Promise.all([newActivation, concurrentNewActivation])).resolves.toHaveLength(2);
    expect(oldActivationCalls).toBe(0);
    expect(newActivationCalls).toBe(1);
    expect(registry.isActive('workbench-kit.test.re-register')).toBe(true);
  });

  it('invalidates pending activation when the registry is disposed', async () => {
    const registry = new ExtensionRegistry();
    const activationEvents: string[] = [];
    let subscriptionDisposals = 0;
    let resolveActivation: () => void = () => undefined;
    let signalActivationStarted: () => void = () => undefined;
    const activationGate = new Promise<void>((resolve) => {
      resolveActivation = resolve;
    });
    const activationStarted = new Promise<void>((resolve) => {
      signalActivationStarted = resolve;
    });

    registry.onDidActivateExtension((event) => activationEvents.push(event.extensionId));
    registry.registerExtension(
      createTestExtension('workbench-kit.test.pending-dispose', {
        activate: async (context) => {
          context.subscriptions.add({
            dispose: () => {
              subscriptionDisposals += 1;
            },
          });
          signalActivationStarted();
          await activationGate;
        },
      }),
    );

    const activation = registry.activateExtension('workbench-kit.test.pending-dispose');
    await activationStarted;
    registry.dispose();

    expect(subscriptionDisposals).toBe(1);
    resolveActivation();

    await expect(activation).rejects.toThrow(
      'Extension "workbench-kit.test.pending-dispose" activation was invalidated.',
    );
    expect(registry.isActive('workbench-kit.test.pending-dispose')).toBe(false);
    expect(activationEvents).toEqual([]);
  });

  it('normalizes panels and statusBar contributions', () => {
    const registry = new ExtensionRegistry();
    registry.registerExtension({
      manifest: {
        schemaVersion: 1,
        id: 'workbench-kit.samples.status-bar',
        name: 'samples-status-bar',
        displayName: 'Status Bar Sample',
        version: '0.0.0',
        publisher: 'workbench-kit',
        engines: {
          workbench: '^0.0.0',
          extensionApi: '^0.0.0',
        },
        activationEvents: ['onStartup'],
        contributes: {
          panels: [
            {
              id: 'sampleProblems',
              title: 'Problems',
              viewId: 'workbench-kit.samples.status-bar.problems',
            },
          ],
          statusBar: [
            {
              alignment: 'left',
              command: 'workbench-kit.samples.status-bar.ping',
              id: 'workbench-kit.samples.status-bar.left',
              priority: 10,
              text: 'Sample Left',
            },
          ],
        },
      },
    });

    expect(registry.views.getViewContainers('panel')).toEqual([
      {
        id: 'sampleProblems',
        location: 'panel',
        title: 'Problems',
      },
    ]);
    expect(registry.views.getView('workbench-kit.samples.status-bar.problems')).toMatchObject({
      containerId: 'sampleProblems',
      id: 'workbench-kit.samples.status-bar.problems',
      name: 'Problems',
    });
    expect(registry.statusBar.getStatusBarItems()).toEqual([
      {
        alignment: 'left',
        command: 'workbench-kit.samples.status-bar.ping',
        extensionId: 'workbench-kit.samples.status-bar',
        id: 'workbench-kit.samples.status-bar.left',
        priority: 10,
        text: 'Sample Left',
      },
    ]);
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

  it('resolves host-registered capabilities through getCapability', async () => {
    const registry = new ExtensionRegistry();
    registry.capabilityRegistry.registerValue('workbench.test.capability', { id: 'host-test' });

    registry.registerExtension({
      ...helloWorldExtension,
      manifest: {
        ...helloWorldExtension.manifest,
        activationEvents: ['onStartup'],
      },
      module: {
        activate: (context) => {
          expect(context.getCapability<{ id: string }>('workbench.test.capability')).toEqual({
            id: 'host-test',
          });
        },
      },
    });

    await registry.activateStartup();
  });

  it('denies sensitive getCapability without manifest permission and requires', async () => {
    const registry = new ExtensionRegistry();
    registry.capabilityRegistry.registerValue('workbench.auth', { id: 'host-auth' });

    registry.registerExtension({
      ...helloWorldExtension,
      manifest: {
        ...helloWorldExtension.manifest,
        activationEvents: ['onStartup'],
      },
      module: {
        activate: (context) => {
          expect(() => context.getCapability('workbench.auth')).toThrow(
            /did not declare required capability/,
          );
        },
      },
    });

    await registry.activateStartup();
  });

  it('allows workbench.auth getCapability when requires and permission are declared', async () => {
    const registry = new ExtensionRegistry();
    registry.capabilityRegistry.registerValue('workbench.auth', { id: 'host-auth' });

    registry.registerExtension({
      ...helloWorldExtension,
      manifest: {
        ...helloWorldExtension.manifest,
        activationEvents: ['onStartup'],
        capabilities: { requires: ['workbench.auth'] },
        permissions: ['account.read'],
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

  it('denies workbench.workspace getCapability without manifest permission and requires', async () => {
    const registry = new ExtensionRegistry();
    registry.capabilityRegistry.registerValue('workbench.workspace', { ready: true });

    registry.registerExtension({
      ...helloWorldExtension,
      manifest: {
        ...helloWorldExtension.manifest,
        activationEvents: ['onStartup'],
      },
      module: {
        activate: (context) => {
          expect(() => context.getCapability('workbench.workspace')).toThrow(
            /did not declare required capability/,
          );
        },
      },
    });

    await registry.activateStartup();
  });

  it('allows workbench.workspace getCapability when requires and permission are declared', async () => {
    const registry = new ExtensionRegistry();
    registry.capabilityRegistry.registerValue('workbench.workspace', { ready: true });

    registry.registerExtension({
      ...helloWorldExtension,
      manifest: {
        ...helloWorldExtension.manifest,
        activationEvents: ['onStartup'],
        capabilities: { requires: ['workbench.workspace'] },
        permissions: ['workspace.read'],
      },
      module: {
        activate: (context) => {
          expect(context.getCapability<{ ready: boolean }>('workbench.workspace')).toEqual({
            ready: true,
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
