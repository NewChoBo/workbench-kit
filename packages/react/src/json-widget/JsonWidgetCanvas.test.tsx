import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { formatWidgetJson, type GenericWidget } from '@workbench-kit/json-widget';

import { JsonWidgetCanvas } from './JsonWidgetCanvas.js';
import { createWidgetRendererRegistry } from './renderer/createWidgetRendererRegistry.js';
import type { WidgetRendererProps } from './renderer/contract.js';

const GRID_DOC: GenericWidget = {
  type: 'grid',
  columns: 2,
  gap: 8,
  children: [
    { type: 'text', col: 0, row: 0, text: 'Cell one' },
    { type: 'text', col: 1, row: 0, text: 'Cell two' },
  ],
};

describe('JsonWidgetCanvas', () => {
  it('renders a widget JSON document to real DOM', () => {
    const markup = renderToStaticMarkup(<JsonWidgetCanvas json={formatWidgetJson(GRID_DOC)} />);
    expect(markup).toContain('data-testid="json-widget-canvas"');
    expect(markup).toContain('Cell one');
    expect(markup).toContain('Cell two');
  });

  it('surfaces parse errors', () => {
    const markup = renderToStaticMarkup(<JsonWidgetCanvas json="{" />);
    expect(markup).toContain('data-testid="json-widget-canvas-error"');
    expect(markup).toContain('role="alert"');
  });

  it('renders consumer-registered widget types via the registry prop', () => {
    function BadgeRenderer({ widget }: WidgetRendererProps) {
      return <span data-widget-type="badge">{String(widget.label ?? '')}</span>;
    }
    const registry = createWidgetRendererRegistry([{ type: 'badge', build: BadgeRenderer }]);
    const markup = renderToStaticMarkup(
      <JsonWidgetCanvas
        json={formatWidgetJson({ type: 'badge', label: 'Beta' })}
        registry={registry}
      />,
    );
    expect(markup).toContain('data-widget-type="badge"');
    expect(markup).toContain('Beta');
  });
});
