import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createWidgetDocument, getWidgetChildren } from '@workbench-kit/json-widget';

import { WidgetInspectorPanel } from './WidgetInspectorPanel.js';
import { WIDGET_TREE_DEMO_REGISTRY, WIDGET_TREE_WELCOME_DOCUMENT } from './demo-registry.js';

describe('WidgetInspectorPanel', () => {
  it('renders inspector fields for a selected widget', () => {
    const document = createWidgetDocument(WIDGET_TREE_WELCOME_DOCUMENT);
    const widget = document.root ? getWidgetChildren(document.root)[0] : undefined;

    const markup = renderToStaticMarkup(
      <WidgetInspectorPanel
        path={[{ kind: 'children', index: 0 }]}
        widget={widget ?? null}
        widgetRegistry={WIDGET_TREE_DEMO_REGISTRY}
        onPatch={() => undefined}
      />,
    );

    expect(markup).toContain('data-testid="widget-tree-inspector-panel"');
    expect(markup).toContain('Content');
    expect(markup).toContain('Widget Tree');
  });

  it('renders grid placement fields when parent is a grid', () => {
    const markup = renderToStaticMarkup(
      <WidgetInspectorPanel
        parentWidget={{ type: 'grid', columns: 2, children: [] }}
        path={[{ kind: 'children', index: 0 }]}
        widget={{ type: 'text', text: 'A', col: 0, row: 0 }}
        widgetRegistry={WIDGET_TREE_DEMO_REGISTRY}
        onPatch={() => undefined}
      />,
    );

    expect(markup).toContain('Grid placement');
    expect(markup).toContain('Column');
  });

  it('prompts for selection when no widget is active', () => {
    const markup = renderToStaticMarkup(
      <WidgetInspectorPanel widget={null} path={[]} widgetRegistry={WIDGET_TREE_DEMO_REGISTRY} />,
    );

    expect(markup).toContain('Select a node in the outline.');
  });
});
