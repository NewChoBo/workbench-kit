import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { GenericWidget } from '@workbench-kit/json-widget';

import type { WidgetRendererProps } from './contract.js';
import { WidgetRendererProvider } from './context.js';
import { createWidgetRendererRegistry } from './createWidgetRendererRegistry.js';
import {
  BUILTIN_WIDGET_TYPES,
  getBuiltinWidgetRenderer,
  isBuiltinWidgetType,
} from './builtin-renderers.js';
import { WidgetRenderer } from './WidgetRenderer.js';

const ROOT_RECT = { x: 0, y: 0, width: 200, height: 200 };

function renderWidget(
  widget: GenericWidget,
  options?: {
    registry?: ReturnType<typeof createWidgetRendererRegistry>;
    resolveAssetSrc?: (src: string) => string;
  },
): string {
  return renderToStaticMarkup(
    <WidgetRendererProvider registry={options?.registry} resolveAssetSrc={options?.resolveAssetSrc}>
      <WidgetRenderer widget={widget} rect={ROOT_RECT} />
    </WidgetRendererProvider>,
  );
}

describe('builtin widget renderers', () => {
  it('exposes the generic domain-neutral builtin set', () => {
    expect([...BUILTIN_WIDGET_TYPES].sort()).toEqual(
      ['box', 'column', 'divider', 'grid', 'image', 'row', 'spacer', 'stack', 'text'].sort(),
    );
    expect(isBuiltinWidgetType('grid')).toBe(true);
    expect(isBuiltinWidgetType('tile')).toBe(false);
    expect(getBuiltinWidgetRenderer('tile')).toBeNull();
  });

  it('renders text content', () => {
    const markup = renderWidget({ type: 'text', text: 'Hello kit' });
    expect(markup).toContain('Hello kit');
    expect(markup).toContain('data-widget-type="text"');
  });

  it('renders a grid of boxes with absolute child rects', () => {
    const markup = renderWidget({
      type: 'grid',
      columns: 2,
      gap: 10,
      children: [
        { type: 'box', col: 0, row: 0 },
        { type: 'box', col: 1, row: 0 },
      ],
    });
    const boxes = markup.match(/data-widget-type="box"/g) ?? [];
    expect(boxes).toHaveLength(2);
    expect(markup).toContain('position:absolute');
  });

  it('renders nested row/column containers', () => {
    const markup = renderWidget({
      type: 'row',
      children: [
        { type: 'column', children: [{ type: 'text', text: 'A' }] },
        { type: 'text', text: 'B' },
      ],
    });
    expect(markup).toContain('data-widget-type="row"');
    expect(markup).toContain('data-widget-type="column"');
    expect(markup).toContain('A');
    expect(markup).toContain('B');
  });

  it('resolves image src through the injected asset resolver', () => {
    const markup = renderWidget(
      { type: 'image', src: 'logo.png' },
      { resolveAssetSrc: (src) => `https://cdn.example/${src}` },
    );
    expect(markup).toContain('https://cdn.example/logo.png');
  });

  it('falls back to a neutral placeholder for unknown types', () => {
    const markup = renderWidget({ type: 'tile', label: 'Game' });
    expect(markup).toContain('data-widget-type="unknown"');
    expect(markup).toContain('data-widget-unknown-type="tile"');
  });
});

describe('registry-based custom renderers', () => {
  function TileRenderer({ widget, rect }: WidgetRendererProps) {
    const label = typeof widget.label === 'string' ? widget.label : 'Tile';
    return (
      <div data-widget-type="custom-tile" style={{ position: 'absolute', width: rect.width }}>
        {label}
      </div>
    );
  }

  it('renders a consumer-registered widget type', () => {
    const registry = createWidgetRendererRegistry([{ type: 'tile', build: TileRenderer }]);
    const markup = renderWidget({ type: 'tile', label: 'Library item' }, { registry });
    expect(markup).toContain('data-widget-type="custom-tile"');
    expect(markup).toContain('Library item');
  });

  it('resolves nested custom types inside builtin layout containers', () => {
    const registry = createWidgetRendererRegistry([{ type: 'tile', build: TileRenderer }]);
    const markup = renderWidget(
      {
        type: 'grid',
        columns: 1,
        children: [{ type: 'tile', col: 0, row: 0, label: 'Nested tile' }],
      },
      { registry },
    );
    expect(markup).toContain('data-widget-type="custom-tile"');
    expect(markup).toContain('Nested tile');
  });
});
