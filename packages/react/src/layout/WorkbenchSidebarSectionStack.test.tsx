import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkbenchSidebarSectionStack } from './WorkbenchSidebarSectionStack';

describe('WorkbenchSidebarSectionStack', () => {
  it('keeps collapsed section headers in their original order by default', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSidebarSectionStack
        items={[
          {
            children: <span>Top body</span>,
            defaultCollapsed: true,
            id: 'top',
            title: 'Top',
          },
          {
            children: <span>Middle body</span>,
            id: 'middle',
            title: 'Middle',
          },
          {
            children: <span>Bottom body</span>,
            id: 'bottom',
            title: 'Bottom',
          },
        ]}
      />,
    );

    expect(markup.indexOf('Top')).toBeLessThan(markup.indexOf('Middle'));
    expect(markup.indexOf('Middle')).toBeLessThan(markup.indexOf('Bottom'));
    expect(markup).not.toContain('Top body');
    expect(markup).toContain('Middle body');
    expect(markup).toContain('Bottom body');
  });
});
