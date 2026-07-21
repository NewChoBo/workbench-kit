import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SideBarListItem } from './SideBarViewFrame';
import { WorkbenchSidebarSection } from './WorkbenchSidebarActions';

describe('WorkbenchSidebarSection list nesting', () => {
  it('offsets SideBarListItem depth by one under a nested section', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSidebarSection title="Library sources">
        <SideBarListItem>Steam</SideBarListItem>
      </WorkbenchSidebarSection>,
    );

    expect(markup).toContain('--depth:1');
    expect(markup).toContain('--ui-sidebar-tree-indent-offset:14px');
  });

  it('keeps relative tree depth on top of the section nest offset', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSidebarSection title="Workspace">
        <SideBarListItem depth={2}>Nested file</SideBarListItem>
      </WorkbenchSidebarSection>,
    );

    expect(markup).toContain('--depth:3');
    expect(markup).toContain('--ui-sidebar-tree-indent-offset:34px');
  });

  it('does not nest when nestListItems is false', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSidebarSection nestListItems={false} title="Flat">
        <SideBarListItem>Row</SideBarListItem>
      </WorkbenchSidebarSection>,
    );

    expect(markup).toContain('--depth:0');
    expect(markup).toContain('--ui-sidebar-tree-indent-offset:4px');
  });
});
