import { describe, expect, it } from 'vitest';

import {
  normalizeMenuContributions,
  normalizeViewContainers,
  normalizeViews,
  toCommandDefinition,
} from './extension-contribution-normalizers.js';

describe('extension contribution normalizers', () => {
  it('maps command contributions to command definitions', () => {
    expect(
      toCommandDefinition({
        category: 'Sample',
        command: 'sample.run',
        enablement: 'sample.enabled',
        icon: 'play',
        title: 'Run Sample',
      }),
    ).toEqual({
      category: 'Sample',
      enablement: 'sample.enabled',
      icon: 'play',
      id: 'sample.run',
      title: 'Run Sample',
    });
  });

  it('normalizes object-form menu contributions with inherited menu locations', () => {
    expect(
      normalizeMenuContributions({
        'explorer/context': [
          {
            command: 'sample.inspect',
            group: 'navigation',
          },
        ],
      }),
    ).toEqual([
      {
        command: 'sample.inspect',
        group: 'navigation',
        menu: 'explorer/context',
      },
    ]);
  });

  it('normalizes view containers and views with inherited locations', () => {
    expect(
      normalizeViewContainers({
        activitybar: [
          {
            id: 'sample',
            title: 'Sample',
          },
        ],
      }),
    ).toEqual([
      {
        id: 'sample',
        location: 'activitybar',
        title: 'Sample',
      },
    ]);

    expect(
      normalizeViews({
        sample: [
          {
            id: 'sample.view',
            name: 'Sample View',
          },
        ],
      }),
    ).toEqual([
      {
        containerId: 'sample',
        id: 'sample.view',
        name: 'Sample View',
      },
    ]);
  });
});
