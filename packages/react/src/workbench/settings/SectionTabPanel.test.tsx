import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkbenchSectionTabPanel } from './SectionTabPanel';

describe('WorkbenchSectionTabPanel', () => {
  it('renders horizontal section tabs and a single scroll root', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSectionTabPanel
        ariaLabel="Horizontal sections"
        items={[
          {
            anchorId: 'general',
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

    expect(markup).toContain('ui-workbench-section-tab-panel');
    expect(markup).toContain('ui-workbench-section-tab-panel__bar');
    expect(markup).toContain('ui-workbench-section-tab-panel__scroll');
    expect(markup).toContain('ui-scroll-area--overlay-host');
    expect(markup).toContain('ui-scroll-area__viewport');
    expect(markup).toContain('aria-label="Horizontal sections"');
    expect(markup).toContain('href="#general"');
    expect(markup).not.toContain('ui-workbench-navigation-panel');
    expect(markup).not.toContain('ui-workbench-sectioned-panel-host');
  });

  it('supports equal-width tabs', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSectionTabPanel
        ariaLabel="Horizontal sections"
        equalWidthTabs
        items={[
          {
            anchorId: 'general',
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

    expect(markup).toContain('data-equal-width-tabs="true"');
  });

  it('omits navigation for a single section', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchSectionTabPanel
        ariaLabel="Single section"
        items={[
          {
            anchorId: 'only',
            render: () => <section id="only">Only section</section>,
            title: 'Only',
          },
        ]}
      />,
    );

    expect(markup).not.toContain('ui-workbench-section-tab-panel__bar');
    expect(markup).toContain('Only section');
  });
});
