import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SidebarSlotChrome } from './SidebarSlotChrome';

describe('SidebarSlotChrome', () => {
  it('renders leading content and trailing actions in panel header chrome', () => {
    const markup = renderToStaticMarkup(
      <SidebarSlotChrome
        actions={<button type="button">Refresh</button>}
        data-test-slot="primary"
        leading={<span>Library</span>}
      />,
    );

    expect(markup).toContain('ui-sidebar-slot-chrome');
    expect(markup).toContain('ui-panel-header__title');
    expect(markup).toContain('ui-panel-header__actions');
    expect(markup).toContain('Library');
    expect(markup).toContain('Refresh');
  });
});
