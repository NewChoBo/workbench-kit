import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkbenchSectionedPanel } from './SectionedPanel';

describe('WorkbenchSectionedPanel', () => {
  it('renders section navigation and content items', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSectionedPanel
        ariaLabel="Settings sections"
        items={[
          {
            anchorId: 'general',
            count: 2,
            render: () => <section id="general">General settings</section>,
            title: 'General',
          },
          {
            anchorId: 'advanced',
            render: () => <section id="advanced">Advanced settings</section>,
            title: 'Advanced',
          },
        ]}
      />,
    );

    expect(markup).toContain('ui-workbench-sectioned-panel');
    expect(markup).toContain('data-has-nav="true"');
    expect(markup).toContain('aria-label="Settings sections"');
    expect(markup).toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-workbench-navigation-panel__nav-scroll',
    );
    expect(markup).not.toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-scroll-area--stable-gutter ui-workbench-navigation-panel__nav-scroll',
    );
    expect(markup).toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-workbench-navigation-panel__content-scroll',
    );
    expect(markup).not.toContain(
      'ui-scroll-area ui-workbench-scrollbar ui-scroll-area--vertical ui-scroll-area--stable-gutter ui-workbench-navigation-panel__content-scroll',
    );
    expect(markup).toContain('href="#general"');
    expect(markup).toContain('General settings');
    expect(markup).toContain('Advanced settings');
  });

  it('omits navigation for a single section and marks readonly panels', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSectionedPanel
        ariaLabel="Single section"
        items={[
          {
            anchorId: 'only',
            render: () => <section id="only">Only section</section>,
            title: 'Only',
          },
        ]}
        readOnly
      />,
    );

    expect(markup).toContain('data-readonly="true"');
    expect(markup).not.toContain('ui-workbench-sectioned-panel__nav');
    expect(markup).toContain('Only section');
  });
});
