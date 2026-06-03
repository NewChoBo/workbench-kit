import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkbenchShell } from './WorkbenchShell';

describe('WorkbenchShell', () => {
  it('renders the standard shell layout with activity, split-body, status, and overlays', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchShell
        activityBar={{
          items: [
            { id: 'explorer', icon: 'E', label: 'Explorer' },
            { id: 'search', icon: 'S', label: 'Search' },
          ],
        }}
        compactStatus
        primarySidebar={{
          isVisible: true,
          node: <aside>primary area</aside>,
          primarySizePercent: 30,
          minPrimarySizePercent: 15,
          maxPrimarySizePercent: 70,
          onSizePercentChange: () => {},
        }}
        rootClassName="shell-root"
        rootStyle={{ background: 'black' }}
        secondaryArea={<main>secondary area</main>}
        statusSections={[
          {
            id: 'left',
            items: [
              {
                id: 'status',
                label: 'Ready',
              },
            ],
          },
        ]}
        overlays={<div>overlay layer</div>}
        theme="dark"
      />,
    );

    expect(markup).toContain('class="shell-root"');
    expect(markup).toContain('data-theme="dark"');
    expect(markup).toContain('ui-workbench-activity-bar');
    expect(markup).toContain('ui-workbench-split-view');
    expect(markup).toContain('primary area');
    expect(markup).toContain('secondary area');
    expect(markup).toContain('ui-workbench-status-bar--compact');
    expect(markup).toContain('overlay layer');
  });

  it('renders secondary area directly when primary sidebar is hidden', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchShell
        activityBar={{ items: [{ id: 'explorer', icon: 'E', label: 'Explorer' }] }}
        primarySidebar={{
          isVisible: false,
          node: <aside>hidden sidebar</aside>,
        }}
        secondaryArea={<main>secondary only</main>}
        statusSections={[]}
      />,
    );

    expect(markup).not.toContain('ui-workbench-split-view');
    expect(markup).toContain('secondary only');
    expect(markup).not.toContain('hidden sidebar');
    expect(markup).toContain('ui-workbench-status-bar');
  });
});
