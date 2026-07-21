import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchActionSidebar } from './WorkbenchActionSidebar.js';

describe('WorkbenchActionSidebar', () => {
  it('renders declarative action rows inside a sidebar frame', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchActionSidebar
        data-testid="action-sidebar"
        items={[
          {
            description: 'jdw/showcase/example.jdw.json',
            id: 'widget-tree',
            label: 'Widget Tree',
            selected: true,
            testId: 'open-widget-tree',
          },
          {
            description: 'jdw/templates/analytics-dashboard.jdw.json',
            id: 'template-jdw',
            label: 'Template JDW',
            testId: 'open-template-jdw',
          },
        ]}
        listProps={{ 'aria-label': 'Lab surfaces' }}
      />,
    );

    expect(markup).toContain('data-testid="action-sidebar"');
    expect(markup).toContain('Lab surfaces');
    expect(markup).toContain('Widget Tree');
    expect(markup).toContain('jdw/showcase/example.jdw.json');
    expect(markup).toContain('data-testid="open-widget-tree"');
    expect(markup).toContain('data-selected="true"');
  });
});
