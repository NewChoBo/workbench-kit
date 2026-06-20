import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkbenchNavigationPanel } from './NavigationPanel';

describe('WorkbenchNavigationPanel', () => {
  it('renders shared nav and content regions', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchNavigationPanel
        content={<section>Settings content</section>}
        contentClassName="custom-content"
        nav={<button type="button">General</button>}
        navClassName="custom-nav"
        navProps={{ 'aria-label': 'Settings categories' }}
      />,
    );

    expect(markup).toContain('ui-workbench-navigation-panel');
    expect(markup).toContain('data-has-nav="true"');
    expect(markup).toContain('ui-workbench-navigation-panel__nav custom-nav');
    expect(markup).toContain('ui-scroll-area');
    expect(markup).toContain('aria-label="Settings categories"');
    expect(markup).toContain('ui-workbench-navigation-panel__content custom-content');
    expect(markup).toContain('Settings content');
  });

  it('omits nav when no nav content is provided', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchNavigationPanel content={<section>Full width content</section>} />,
    );

    expect(markup).not.toContain('ui-workbench-navigation-panel__nav');
    expect(markup).toContain('Full width content');
  });
});
