import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SideBarViewTitleMenu } from './SideBarViewTitleMenu';

describe('SideBarViewTitleMenu', () => {
  it('renders the view title menu trigger with view id hook', () => {
    const markup = renderToStaticMarkup(
      <SideBarViewTitleMenu
        currentSlot="primary"
        menuAriaLabel="View actions"
        menuButtonLabel="View actions"
        moveToPrimaryLabel="Move to Primary Side Bar"
        moveToSecondaryLabel="Move to Secondary Side Bar"
        viewId="explorer"
      />,
    );

    expect(markup).toContain('data-side-bar-view-title-menu="explorer"');
    expect(markup).toContain('codicon-ellipsis');
  });
});
