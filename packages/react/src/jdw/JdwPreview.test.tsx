import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, formatJsonWidgetData } from '@workbench-kit/jdw';

import { JdwPreview } from './JdwPreview.js';

interface DemoWidget extends WidgetTypeShape {
  type: 'demo:card';
  title: string;
}

describe('JdwPreview', () => {
  it('renders mock registry output for valid widget JSON', () => {
    const registry = createWidgetRegistry<(widget: DemoWidget) => string, DemoWidget>([
      {
        type: 'demo:card',
        build: (widget) => widget.title,
      },
    ]);

    const markup = renderToStaticMarkup(
      <JdwPreview
        json={formatJsonWidgetData({
          type: 'demo:card',
          args: { title: 'Preview title' },
        })}
        registry={registry}
      />,
    );

    expect(markup).toContain('Preview title');
    expect(markup).toContain('data-testid="jdw-preview-output"');
  });

  it('surfaces parse errors without attempting registry render', () => {
    const markup = renderToStaticMarkup(<JdwPreview json="{" />);

    expect(markup).toContain('data-testid="jdw-preview-error"');
    expect(markup).toContain('role="alert"');
  });
});
