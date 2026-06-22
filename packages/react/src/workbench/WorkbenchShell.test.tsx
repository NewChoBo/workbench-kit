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

  it('renders an auxiliary sidebar when requested', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchShell
        activityBar={{ items: [{ id: 'explorer', icon: 'E', label: 'Explorer' }] }}
        auxiliarySidebar={{
          isVisible: true,
          node: <aside>auxiliary area</aside>,
        }}
        secondaryArea={<main>secondary area</main>}
        statusSections={[]}
      />,
    );

    expect(markup).toContain('auxiliary area');
    expect(markup).toContain('ui-workbench-split-view');
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

  it('uses the shell sidebar default instead of the generic split default', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchShell
        activityBar={{ items: [{ id: 'explorer', icon: 'E', label: 'Explorer' }] }}
        primarySidebar={{
          isVisible: true,
          node: <aside>primary area</aside>,
        }}
        secondaryArea={<main>secondary area</main>}
        statusSections={[]}
      />,
    );

    expect(markup).toContain('--ui-workbench-split-primary-size:20%');
  });

  it('renders status sections and items in deterministic order using order metadata', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchShell
        activityBar={{ items: [{ id: 'explorer', icon: 'E', label: 'Explorer' }] }}
        primarySidebar={{
          isVisible: false,
          node: <aside>hidden sidebar</aside>,
        }}
        secondaryArea={<main>content</main>}
        statusSections={[
          {
            id: 'right',
            align: 'end',
            order: 2,
            items: [
              { id: 'right-ordered-late', label: 'right-late', order: 1 },
              { id: 'right-ordered-early', label: 'right-early', order: 0 },
            ],
          },
          {
            id: 'left',
            align: 'start',
            order: 1,
            items: [
              { id: 'left-late', label: 'left-late', order: 1 },
              { id: 'left-early', label: 'left-early', order: 0 },
            ],
          },
          {
            id: 'fallback',
            items: [{ id: 'fallback', label: 'fallback-default-order' }],
          },
        ]}
      />,
    );

    expect(markup.indexOf('left-early')).toBeLessThan(markup.indexOf('left-late'));
    expect(markup.indexOf('left-early')).toBeLessThan(markup.indexOf('right-early'));
    expect(markup.indexOf('right-early')).toBeLessThan(markup.indexOf('right-late'));
    expect(markup.indexOf('fallback-default-order')).toBeGreaterThan(markup.indexOf('right-late'));
  });
});
