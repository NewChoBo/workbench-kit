import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ActivityBar } from './ActivityBar';

describe('ActivityBar', () => {
  it('wraps reorderable items in draggable hosts instead of native button dragging', () => {
    const markup = renderToStaticMarkup(
      <ActivityBar
        items={[
          { id: 'library', icon: 'L', label: 'Library' },
          { id: 'launchpad', icon: 'P', label: 'Launchpad' },
        ]}
        onItemsReorder={() => {}}
        reorderable
      />,
    );

    expect(markup).toContain('ui-workbench-activity-bar__item-host--reorderable');
    expect(markup).toContain(' draggable="true"');
    expect(markup).not.toMatch(/<button[^>]*draggable="true"/);
  });

  it('keeps secondary items non-draggable', () => {
    const markup = renderToStaticMarkup(
      <ActivityBar
        items={[{ id: 'library', icon: 'L', label: 'Library' }]}
        onItemsReorder={() => {}}
        reorderable
        secondaryItems={[{ id: 'settings', icon: 'S', label: 'Settings' }]}
      />,
    );

    expect(markup).toContain('ui-workbench-activity-bar__item-host--reorderable');
    expect(markup).not.toContain('settings" draggable="true"');
  });

  it('marks the nav as a sidebar placement drop zone when configured', () => {
    const markup = renderToStaticMarkup(
      <ActivityBar
        items={[{ id: 'library', icon: 'L', label: 'Library' }]}
        onSidebarViewPlacementDrop={() => undefined}
        sidebarViewPlacementDropZoneId="primary"
      />,
    );

    expect(markup).toContain('data-wb-sidebar-placement-drop-zone="primary"');
  });

  it('allows placement drag without reorder when placementDraggable is enabled', () => {
    const markup = renderToStaticMarkup(
      <ActivityBar items={[{ id: 'library', icon: 'L', label: 'Library' }]} placementDraggable />,
    );

    expect(markup).toContain('ui-workbench-activity-bar__item-host--placement-draggable');
    expect(markup).toContain(' draggable="true"');
    expect(markup).not.toContain('ui-workbench-activity-bar__item-host--reorderable');
  });
});
