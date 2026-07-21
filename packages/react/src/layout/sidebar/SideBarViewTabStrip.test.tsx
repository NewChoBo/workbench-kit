import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SideBarViewTabStrip } from './SideBarViewTabStrip';

describe('SideBarViewTabStrip', () => {
  it('renders icon tabs for view container switching', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewTabStrip
        tabs={[
          {
            active: true,
            icon: 'library',
            id: 'library',
            label: 'Library',
            onSelect: () => undefined,
          },
          {
            icon: 'rocket',
            id: 'launchpad',
            label: 'Launchpad',
            onSelect: () => undefined,
          },
        ]}
      />,
    );

    expect(markup).toContain('data-ui-sidebar-view-tab-strip="true"');
    expect(markup).toContain('ui-sidebar-view-tab-strip');
    expect(markup).toContain('codicon-library');
    expect(markup).toContain('codicon-rocket');
    expect(markup).toContain('ui-sidebar-action-icon-bar__button--active');
    expect(markup).toContain('aria-pressed="true"');
  });

  it('marks tabs draggable when placementDraggable is enabled', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewTabStrip
        placementDraggable
        tabs={[
          {
            icon: 'library',
            id: 'library',
            label: 'Library',
            onSelect: () => undefined,
          },
        ]}
      />,
    );

    expect(markup).toContain('ui-sidebar-action-icon-bar__item-host--placement-draggable');
    expect(markup).toContain('draggable="true"');
  });

  it('marks the strip as a sidebar placement drop zone when configured', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewTabStrip
        onSidebarViewPlacementDrop={() => undefined}
        sidebarViewPlacementDropZoneId="secondary"
        tabs={[
          {
            icon: 'library',
            id: 'library',
            label: 'Library',
            onSelect: () => undefined,
          },
        ]}
      />,
    );

    expect(markup).toContain('data-wb-sidebar-placement-drop-zone="secondary"');
  });

  it('wraps reorderable tabs in draggable hosts', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewTabStrip
        reorderable
        tabs={[
          {
            icon: 'library',
            id: 'library',
            label: 'Library',
            onSelect: () => undefined,
          },
          {
            icon: 'rocket',
            id: 'launchpad',
            label: 'Launchpad',
            onSelect: () => undefined,
          },
        ]}
      />,
    );

    expect(markup).toContain('ui-sidebar-action-icon-bar__item-host--reorderable');
    expect(markup).toContain('ui-sidebar-action-icon-bar--reorderable');
  });
});
