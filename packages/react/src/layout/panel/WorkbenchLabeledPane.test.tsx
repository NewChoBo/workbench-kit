import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { WorkbenchLabeledPane } from './WorkbenchLabeledPane.js';

describe('WorkbenchLabeledPane', () => {
  it('renders title header and body content', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchLabeledPane aria-label="Widget preview" title="Preview">
        <div>Canvas</div>
      </WorkbenchLabeledPane>,
    );

    expect(markup).toContain('ui-workbench-labeled-pane');
    expect(markup).toContain('ui-workbench-labeled-pane__body');
    expect(markup).toContain('ui-scroll-area');
    expect(markup).toContain('ui-scroll-area--vertical');
    expect(markup).toContain('ui-scroll-area--stable-gutter');
    expect(markup).toContain('ui-workbench-scrollbar');
    expect(markup).toContain('Widget preview');
    expect(markup).toContain('Preview');
    expect(markup).toContain('Canvas');
  });

  it('defaults to flat chrome without card radius', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchLabeledPane aria-label="Widget preview" title="Preview">
        <div>Canvas</div>
      </WorkbenchLabeledPane>,
    );

    expect(markup).toContain('ui-workbench-labeled-pane--flat');
    expect(markup).toContain('data-chrome="flat"');
    expect(markup).not.toContain('ui-workbench-labeled-pane--card');
  });

  it('supports card chrome and muted tone', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchLabeledPane chrome="card" header={<span>Custom</span>} tone="muted">
        Body
      </WorkbenchLabeledPane>,
    );

    expect(markup).toContain('ui-workbench-labeled-pane--card');
    expect(markup).toContain('ui-workbench-labeled-pane--muted');
    expect(markup).toContain('Custom');
    expect(markup).toContain('Body');
  });
});
