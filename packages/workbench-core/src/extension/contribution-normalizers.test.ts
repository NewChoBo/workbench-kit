import { describe, expect, it } from 'vitest';

import {
  normalizeMenuContributions,
  normalizePanels,
  normalizeStatusBar,
  normalizeViewContainers,
  normalizeViews,
  toCommandDefinition,
} from './contribution-normalizers.js';

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

  it('expands panels into panel view containers and views', () => {
    expect(
      normalizePanels([
        {
          id: 'problems',
          title: 'Problems',
          viewId: 'sample.problems',
        },
      ]),
    ).toEqual({
      containers: [
        {
          id: 'problems',
          location: 'panel',
          title: 'Problems',
        },
      ],
      views: [
        {
          containerId: 'problems',
          id: 'sample.problems',
          name: 'Problems',
        },
      ],
    });
  });

  it('keeps valid statusBar contributions and drops invalid entries', () => {
    expect(
      normalizeStatusBar([
        {
          alignment: 'left',
          id: 'sample.left',
          priority: 10,
          text: 'Left',
          command: 'sample.ping',
        },
        {
          alignment: 'center',
          id: 'sample.bad',
          text: 'Bad',
        },
        {
          alignment: 'right',
          id: 'sample.right',
          text: 'Right',
        },
      ]),
    ).toEqual([
      {
        alignment: 'left',
        command: 'sample.ping',
        id: 'sample.left',
        priority: 10,
        text: 'Left',
      },
      {
        alignment: 'right',
        id: 'sample.right',
        text: 'Right',
      },
    ]);
  });
});
