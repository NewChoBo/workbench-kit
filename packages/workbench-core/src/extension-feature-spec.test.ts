import { describe, expect, it } from 'vitest';

import { createExtensionFeatureSpec } from './extension-feature-spec.js';
import { ExtensionRegistry } from './extension-registry.js';
import type { WorkbenchExtensionDescription } from './extension-registry.js';

const featureExtension: WorkbenchExtensionDescription = {
  extensionPath: 'extensions/workbench-kit.feature',
  manifest: {
    schemaVersion: 1,
    id: 'workbench-kit.feature',
    name: 'feature',
    displayName: 'Feature Extension',
    version: '1.0.0',
    publisher: 'workbench-kit',
    engines: {
      workbench: '^0.0.0',
      extensionApi: '^0.0.0',
    },
    activationEvents: ['onCommand:workbench-kit.feature.run'],
    capabilities: {
      provides: ['workbench.feature'],
      requires: ['workbench.auth'],
    },
    contributes: {
      activities: [
        {
          icon: 'tools',
          id: 'workbench-kit.feature.activity',
          title: 'Feature',
          viewContainerId: 'feature',
        },
      ],
      commands: [
        {
          argsSchema: {
            type: 'array',
          },
          category: 'Feature',
          command: 'workbench-kit.feature.run',
          danger: true,
          description: 'Runs the feature command.',
          requiresApproval: true,
          title: 'Run Feature',
        },
      ],
      configuration: {
        properties: {
          'workbench.feature.enabled': {
            default: true,
            description: 'Enable feature mode.',
            scope: 'workspace',
            type: 'boolean',
          },
        },
      },
      documentViews: [
        {
          filenamePatterns: ['*.feature.json'],
          id: 'workbench-kit.feature.preview',
          kind: 'preview',
          label: 'Feature Preview',
          mimeTypes: ['application/json'],
          priority: 50,
        },
      ],
      keybindings: [
        {
          command: 'workbench-kit.feature.run',
          key: 'ctrl+alt+f',
        },
      ],
      menus: {
        commandPalette: [
          {
            command: 'workbench-kit.feature.run',
            group: 'feature',
          },
        ],
      } as never,
      viewContainers: {
        activitybar: [
          {
            icon: 'tools',
            id: 'feature',
            title: 'Feature',
          },
        ],
      },
      views: {
        feature: [
          {
            id: 'workbench-kit.feature.view',
            name: 'Feature View',
          } as never,
        ],
      },
    },
    extensionOptionalDependencies: ['workbench-kit.optional'],
    permissions: ['account.read'],
  },
};

describe('createExtensionFeatureSpec', () => {
  it('normalizes manifest contributions into a flat feature spec', () => {
    const feature = createExtensionFeatureSpec(featureExtension);

    expect(feature).toMatchObject({
      displayName: 'Feature Extension',
      extensionPath: 'extensions/workbench-kit.feature',
      id: 'workbench-kit.feature',
      permissions: ['account.read'],
    });
    expect(feature.capabilities).toEqual({
      provides: ['workbench.feature'],
      requires: ['workbench.auth'],
    });
    expect(feature.commands).toEqual([
      expect.objectContaining({
        argsSchema: {
          type: 'array',
        },
        command: 'workbench-kit.feature.run',
        danger: true,
        description: 'Runs the feature command.',
        id: 'workbench-kit.feature.run',
        requiresApproval: true,
        title: 'Run Feature',
      }),
    ]);
    expect(feature.settings).toEqual([
      expect.objectContaining({
        default: true,
        key: 'workbench.feature.enabled',
        scope: 'workspace',
        type: 'boolean',
      }),
    ]);
    expect(feature.documentViews).toEqual([
      {
        filenamePatterns: ['*.feature.json'],
        id: 'workbench-kit.feature.preview',
        kind: 'preview',
        label: 'Feature Preview',
        mimeTypes: ['application/json'],
        priority: 50,
      },
    ]);
    expect(feature.menus).toEqual([
      {
        command: 'workbench-kit.feature.run',
        group: 'feature',
        menu: 'commandPalette',
      },
    ]);
    expect(feature.viewContainers).toEqual([
      {
        icon: 'tools',
        id: 'feature',
        location: 'activitybar',
        title: 'Feature',
      },
    ]);
    expect(feature.views).toEqual([
      {
        containerId: 'feature',
        id: 'workbench-kit.feature.view',
        name: 'Feature View',
      },
    ]);
  });

  it('exposes feature inspections with dependency diagnostics', () => {
    const registry = new ExtensionRegistry();
    registry.registerExtension(featureExtension);

    const [inspection] = registry.getFeatureInspections();

    expect(inspection?.feature.id).toBe('workbench-kit.feature');
    expect(inspection?.diagnostics.map((diagnostic) => diagnostic.kind)).toEqual([
      'missing-optional-extension-dependency',
      'missing-capability',
    ]);
  });
});
