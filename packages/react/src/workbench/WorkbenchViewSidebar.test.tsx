import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchViewSidebar } from './WorkbenchViewSidebar';

describe('WorkbenchViewSidebar', () => {
  it('renders view items with active state, item data attributes, and icons', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchViewSidebar
        activeId="search"
        aria-label="Primary views"
        className="custom-sidebar"
        data-shell-sidebar="primary"
        itemDataAttributeName="data-view-id"
        items={[
          { icon: 'codicon-files', id: 'explorer', label: 'Explorer' },
          { icon: 'codicon-search', id: 'search', label: 'Search' },
        ]}
        listProps={{ 'aria-label': 'Primary view list' }}
        onSelect={() => {}}
        renderIcon={(icon) => <span data-icon={icon} />}
        title="Primary"
      />,
    );

    expect(markup).toContain('ui-workbench-view-sidebar');
    expect(markup).toContain('workbench-primary-side-bar');
    expect(markup).toContain('custom-sidebar');
    expect(markup).toContain('data-shell-sidebar="primary"');
    expect(markup).toContain('aria-label="Primary views"');
    expect(markup).toContain('aria-label="Primary view list"');
    expect(markup).toContain('data-view-id="explorer"');
    expect(markup).toContain('data-view-id="search"');
    expect(markup).toContain('data-icon="codicon-search"');
    expect(markup).toContain('ui-side-bar-list-item--active');
    expect(markup).toContain('ui-side-bar-list-item--selected');
    expect(markup).toContain('Explorer');
    expect(markup).toContain('Search');
  });
});
