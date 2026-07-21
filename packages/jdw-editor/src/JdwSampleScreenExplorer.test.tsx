import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JdwSampleScreenExplorer } from './JdwSampleScreenExplorer.js';
import { ScreenSpecWorkbench } from './ScreenSpecWorkbench.js';

describe('JdwSampleScreenExplorer', () => {
  it('compiles a template into the canonical WidgetTreeLab authoring surface', () => {
    const markup = renderToStaticMarkup(<JdwSampleScreenExplorer />);

    expect(markup).toContain('data-testid="jdw-sample-explorer"');
    expect(markup).toContain('data-testid="jdw-sample-screen-select"');
    expect(markup).toContain('data-testid="widget-tree-lab"');
    expect(markup).toContain('data-testid="widget-tree-asset-palette"');
    expect(markup).toContain('data-testid="widget-asset-screen-spec.text"');
    expect(markup).not.toContain('data-testid="screen-spec-workbench"');
    expect(markup).not.toContain('&quot;title&quot;');
    expect(markup).not.toContain('&quot;frameWidth&quot;');
  });
});

describe('ScreenSpecWorkbench', () => {
  it('renders fixed Outline | Preview | Inspector panes without JSON view toggle', () => {
    const markup = renderToStaticMarkup(
      <ScreenSpecWorkbench
        value={`${JSON.stringify(
          {
            id: 'demo',
            title: 'Demo Screen',
            description: 'Document-backed screen',
            frameWidth: 360,
            layout: { maxWidth: 360, maxHeight: 240 },
            root: { kind: 'text', content: 'Hello' },
          },
          null,
          2,
        )}\n`}
      />,
    );

    expect(markup).toContain('data-testid="screen-spec-workbench"');
    expect(markup).toContain('data-testid="screen-spec-editor"');
    expect(markup).toContain('data-testid="screen-spec-outline"');
    expect(markup).toContain('data-testid="screen-spec-workbench-preview-pane"');
    expect(markup).toContain('data-testid="screen-spec-inspector"');
    expect(markup).toContain('data-testid="jdw-preview-viewport-host"');
    expect(markup).toContain('Demo Screen');
    expect(markup).not.toContain('data-testid="screen-spec-source-editor"');
    expect(markup).not.toContain('data-testid="screen-spec-source-json"');
    expect(markup).not.toContain('data-testid="screen-spec-workbench-source-pane"');
    expect(markup).not.toContain('data-testid="jdw-sample-screen-select"');
    expect(markup).not.toContain('expanded (flex');
  });
});
