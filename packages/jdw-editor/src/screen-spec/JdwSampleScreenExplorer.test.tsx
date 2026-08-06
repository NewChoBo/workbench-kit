import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JdwSampleScreenExplorer } from './JdwSampleScreenExplorer.js';

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
