import { describe, expect, it } from 'vitest';

import {
  buildWorkbenchViewPlacementModel,
  resolveWorkbenchViewContainerRegistry,
} from './workbench-view-placement.js';

describe('resolveWorkbenchViewContainerRegistry', () => {
  it('keeps base containers and accepts non-conflicting contributed containers', () => {
    const registry = resolveWorkbenchViewContainerRegistry({
      baseContainers: [{ id: 'providers', ownerKind: 'core' }],
      contributedContainers: [{ id: 'secondary', ownerKind: 'plugin' }],
    });

    expect(registry.containers).toEqual([
      { id: 'providers', ownerKind: 'core' },
      { id: 'secondary', ownerKind: 'plugin' },
    ]);
    expect(registry.conflicts).toEqual([]);
  });

  it('reports contributed containers that collide with base or prior contributed ids', () => {
    const registry = resolveWorkbenchViewContainerRegistry({
      baseContainers: [{ id: 'providers' }],
      contributedContainers: [
        { id: 'providers', pluginId: 'tools' },
        { id: 'custom-tools', pluginId: 'tools' },
        { id: 'custom-tools', pluginId: 'tools-extra' },
      ],
      mapBaseContainer: (container) => ({ ...container, ownerKind: 'core' as const }),
      mapContributedContainer: (container) => ({
        ...container,
        ownerKind: 'plugin' as const,
      }),
    });

    expect(registry.containers).toEqual([
      { id: 'custom-tools', ownerKind: 'plugin', pluginId: 'tools' },
      { id: 'providers', ownerKind: 'core' },
    ]);
    expect(registry.conflicts.map((container) => [container.id, container.pluginId])).toEqual([
      ['providers', 'tools'],
      ['custom-tools', 'tools-extra'],
    ]);
  });
});

describe('buildWorkbenchViewPlacementModel', () => {
  it('splits placed and orphaned views against registered containers', () => {
    const model = buildWorkbenchViewPlacementModel({
      containers: [
        { id: 'explorer', location: 'activitybar' },
        { id: 'providers', location: 'activitybar' },
      ],
      views: [
        { containerId: 'providers', id: 'providers.steam', title: 'Steam' },
        { containerId: 'missing', id: 'missing.view', title: 'Missing' },
      ],
    });

    expect(model.containers.map((container) => container.id)).toEqual(['explorer', 'providers']);
    expect(model.views.map((view) => view.id)).toEqual(['providers.steam']);
    expect(model.orphanedViews.map((view) => view.id)).toEqual(['missing.view']);
    expect(model.conflicts).toEqual([]);
  });

  it('filters containers, conflicts, and views to a requested container id', () => {
    const model = buildWorkbenchViewPlacementModel({
      conflictContainers: [
        { id: 'providers', owner: 'extension-a' },
        { id: 'secondary', owner: 'extension-b' },
      ],
      containerId: 'providers',
      containers: [
        { id: 'providers', owner: 'core' },
        { id: 'secondary', owner: 'extension-b' },
      ],
      views: [
        { containerId: 'providers', id: 'providers.steam' },
        { containerId: 'secondary', id: 'secondary.tools' },
        { containerId: 'missing', id: 'missing.view' },
      ],
    });

    expect(model.containers).toEqual([{ id: 'providers', owner: 'core' }]);
    expect(model.conflicts).toEqual([{ id: 'providers', owner: 'extension-a' }]);
    expect(model.views.map((view) => view.id)).toEqual(['providers.steam']);
    expect(model.orphanedViews).toEqual([]);
  });
});
