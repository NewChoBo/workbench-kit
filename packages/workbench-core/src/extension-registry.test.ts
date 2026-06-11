import { describe, expect, it } from 'vitest';

import { ExtensionRegistry, type WorkbenchExtensionDescription } from './index.js';

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
});
