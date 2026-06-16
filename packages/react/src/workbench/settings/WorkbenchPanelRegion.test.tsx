import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchPanelRegion } from './WorkbenchPanelRegion';

describe('WorkbenchPanelRegion', () => {
  it('uses the shared scroll area for scroll layout', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPanelRegion aria-label="Settings content">Settings</WorkbenchPanelRegion>,
    );

    expect(markup).toContain('ui-workbench-panel-region--scroll');
    expect(markup).toContain('ui-scroll-area');
    expect(markup).toContain('ui-workbench-scrollbar');
  });

  it('keeps fill layout non-scrollable', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPanelRegion layout="fill">Canvas</WorkbenchPanelRegion>,
    );

    expect(markup).toContain('ui-workbench-panel-region--fill');
    expect(markup).not.toContain('ui-scroll-area');
  });
});
