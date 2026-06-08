import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { WidgetTypeShape } from '@workbench-kit/contracts';
import { createWidgetRegistry, formatWidgetJson } from '@workbench-kit/json-widget';

import { JsonWidgetEditor } from './JsonWidgetEditor.js';

vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor">Mocked Monaco Editor</div>,
  loader: {
    config: vi.fn(),
  },
}));

vi.mock('monaco-editor', () => ({}));

vi.mock('./tree-panel/WidgetTreePanel.js', () => ({
  WidgetTreePanel: () => <div role="tree" aria-label="Widget tree" />,
}));

interface DemoWidget extends WidgetTypeShape {
  type: 'demo:card';
  title: string;
}

describe('JsonWidgetEditor', () => {
  it('renders split editor with tree, preview, and inspector regions', () => {
    const registry = createWidgetRegistry<(widget: DemoWidget) => string, DemoWidget>([
      {
        type: 'demo:card',
        build: (widget) => widget.title,
        inspector: [
          {
            title: 'Card',
            fields: [{ kind: 'text', prop: 'title', label: 'Title' }],
          },
        ],
      },
    ]);

    const markup = renderToStaticMarkup(
      <JsonWidgetEditor
        defaultMode="split"
        value={formatWidgetJson({ type: 'demo:card', title: 'Tile preview' })}
        widgetRegistry={registry}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('ui-json-widget-editor');
    expect(markup).toContain('data-mode="split"');
    expect(markup).toContain('Widget tree');
    expect(markup).toContain('Tile preview');
    expect(markup).toContain('Inspector');
  });

  it('shows dirty indicator when value differs from baseline', () => {
    const registry = createWidgetRegistry<(widget: DemoWidget) => string, DemoWidget>([
      {
        type: 'demo:card',
        build: (widget) => widget.title,
      },
    ]);

    const baseline = formatWidgetJson({ type: 'demo:card', title: 'Original' });
    const changed = formatWidgetJson({ type: 'demo:card', title: 'Changed' });

    const markup = renderToStaticMarkup(
      <JsonWidgetEditor
        baselineValue={baseline}
        defaultMode="preview"
        value={changed}
        widgetRegistry={registry}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('title="Unsaved changes"');
  });
});
