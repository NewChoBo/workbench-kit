import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, formatWidgetJson } from '@workbench-kit/json-widget';

import { JsonWidgetPreview } from './JsonWidgetPreview.js';

interface DemoWidget extends WidgetTypeShape {
  type: 'demo:card';
  title: string;
}

describe('JsonWidgetPreview', () => {
  it('renders mock registry output for valid widget JSON', () => {
    const registry = createWidgetRegistry<(widget: DemoWidget) => string, DemoWidget>([
      {
        type: 'demo:card',
        build: (widget) => widget.title,
      },
    ]);

    const markup = renderToStaticMarkup(
      <JsonWidgetPreview
        json={formatWidgetJson({ type: 'demo:card', title: 'Preview title' })}
        registry={registry}
      />,
    );

    expect(markup).toContain('Preview title');
    expect(markup).toContain('data-testid="json-widget-preview-output"');
  });

  it('surfaces parse errors without attempting registry render', () => {
    const markup = renderToStaticMarkup(<JsonWidgetPreview json="{" />);

    expect(markup).toContain('data-testid="json-widget-preview-error"');
    expect(markup).toContain('role="alert"');
  });
});
