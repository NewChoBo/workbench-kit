/** @vitest-environment jsdom */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchSidebarStack } from './WorkbenchSidebarStack';

describe('WorkbenchSidebarStack', () => {
  it('renders owned chrome class for sidebar column fill', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSidebarStack data-testid="sidebar">
        <div>Header</div>
        <div>Body</div>
      </WorkbenchSidebarStack>,
    );

    expect(markup).toContain('ui-workbench-sidebar-stack');
    expect(markup).toContain('data-testid="sidebar"');
    expect(markup).toContain('Header');
    expect(markup).toContain('Body');
  });
});
