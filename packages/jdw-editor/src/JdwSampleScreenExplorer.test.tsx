import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JdwSampleScreenExplorer } from './JdwSampleScreenExplorer.js';

describe('JdwSampleScreenExplorer', () => {
  it('renders explorer chrome with the default screen editor', () => {
    const markup = renderToStaticMarkup(<JdwSampleScreenExplorer />);

    expect(markup).toContain('data-testid="jdw-sample-explorer"');
    expect(markup).toContain('Analytics');
    expect(markup).toContain('data-testid="screen-spec-editor"');
    expect(markup).toContain('data-testid="jdw-sample-source-editor"');
    expect(markup).toContain('data-testid="jdw-preview-output"');
  });
});
