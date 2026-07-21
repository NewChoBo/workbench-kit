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
    expect(markup).toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-scroll-area--stable-gutter ui-workbench-navigation-panel__nav-scroll',
    );
    expect(markup).toContain('aria-label="Settings categories"');
    expect(markup).toContain('ui-workbench-navigation-panel__content custom-content');
    expect(markup).toContain('Settings content');
  });

  it('omits nav when no nav content is provided', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchNavigationPanel content={<section>Full width content</section>} />,
    );

    expect(markup).not.toContain('ui-workbench-navigation-panel__nav');
    expect(markup).toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-scroll-area--stable-gutter ui-workbench-navigation-panel__content-scroll',
    );
    expect(markup).toContain('Full width content');
  });

  it('allows content scroll gutter to be automatic', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchNavigationPanel
        content={<section>Nested scroll content</section>}
        contentScrollGutter="auto"
      />,
    );

    expect(markup).toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-workbench-navigation-panel__content-scroll',
    );
    expect(markup).not.toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-scroll-area--stable-gutter ui-workbench-navigation-panel__content-scroll',
    );
  });

  it('allows nav scroll gutter to be automatic', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchNavigationPanel
        content={<section>Settings content</section>}
        nav={<button type="button">General</button>}
        navScrollGutter="auto"
      />,
    );

    expect(markup).toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-workbench-navigation-panel__nav-scroll',
    );
    expect(markup).not.toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-scroll-area--stable-gutter ui-workbench-navigation-panel__nav-scroll',
    );
  });
});
