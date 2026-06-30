import { describe, expect, it } from 'vitest';

import { buildWorkbenchViewPlacementModel } from './workbench-view-placement.js';

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
