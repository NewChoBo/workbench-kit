import { describe, expect, it } from 'vitest';

import {
  createWorkbenchEditorTabsFromViewModel,
  createWorkbenchShellActivityBarFromViewModel,
} from './shellViewModel';

type TestViewId = 'explorer' | 'search' | 'settings';
type TestIcon = `codicon-${string}`;

describe('workbench shell view model adapters', () => {
  it('maps platform activity bar models to shell activity bar props', () => {
    const selected: TestViewId[] = [];
    const activityBar = createWorkbenchShellActivityBarFromViewModel<TestViewId, TestIcon>({
      activeId: 'search',
      activityBarProps: {
        'aria-label': 'Workbench navigation',
        itemDataAttributeName: 'data-nav-item',
      },
      model: {
        footerItems: [{ icon: 'codicon-gear', id: 'settings', label: 'Settings' }],
        sections: [
          [
            { icon: 'codicon-files', id: 'explorer', label: 'Explorer' },
            { icon: 'codicon-search', id: 'search', label: 'Search' },
          ],
        ],
      },
      onSelect: (viewId) => selected.push(viewId),
      renderIcon: (icon) => `icon:${icon}`,
    });

    expect(activityBar).toMatchObject({
      'aria-label': 'Workbench navigation',
      itemDataAttributeName: 'data-nav-item',
      items: [
        {
          active: false,
          icon: 'icon:codicon-files',
          id: 'explorer',
          label: 'Explorer',
          title: 'Explorer',
        },
        {
          active: true,
          icon: 'icon:codicon-search',
          id: 'search',
          label: 'Search',
          title: 'Search',
        },
      ],
      secondaryItems: [
        {
          active: false,
          icon: 'icon:codicon-gear',
          id: 'settings',
          label: 'Settings',
          title: 'Settings',
        },
      ],
    });

    activityBar.onItemActivate?.({ icon: 'unused', id: 'settings', label: 'Settings' });

    expect(selected).toEqual(['settings']);
  });

  it('preserves external activity bar activation handlers', () => {
    const activated: string[] = [];
    const selected: TestViewId[] = [];
    const activityBar = createWorkbenchShellActivityBarFromViewModel<TestViewId, TestIcon>({
      activityBarProps: {
        onItemActivate: (item) => activated.push(item.id),
      },
      model: {
        footerItems: [],
        sections: [[{ icon: 'codicon-files', id: 'explorer', label: 'Explorer' }]],
      },
      onSelect: (viewId) => selected.push(viewId),
      renderIcon: (icon) => icon,
    });

    activityBar.onItemActivate?.(activityBar.items[0]);

    expect(activated).toEqual(['explorer']);
    expect(selected).toEqual(['explorer']);
  });

  it('maps platform editor tab models to editor tabs', () => {
    expect(
      createWorkbenchEditorTabsFromViewModel<TestViewId, TestIcon>({
        items: [
          {
            closable: false,
            dirty: false,
            icon: 'codicon-files',
            id: 'explorer',
            label: 'Explorer',
          },
          {
            closable: true,
            dirty: true,
            icon: 'codicon-search',
            id: 'search',
            label: 'Search',
          },
        ],
      }),
    ).toEqual([
      {
        closable: false,
        dirty: false,
        icon: 'codicon-files',
        id: 'explorer',
        label: 'Explorer',
        title: 'Explorer',
      },
      {
        closable: true,
        dirty: true,
        icon: 'codicon-search',
        id: 'search',
        label: 'Search',
        title: 'Search',
      },
    ]);
  });
});
