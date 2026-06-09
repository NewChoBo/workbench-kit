import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { WidgetTreeLab } from './WidgetTreeLab.js';
import { WIDGET_TREE_DEMO_REGISTRY, WIDGET_TREE_WELCOME_DOCUMENT } from './demo-registry.js';
import { WIDGET_TREE_DEMO_ASSET_CATALOG } from './demo-widget-assets.js';

vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor">Mocked Monaco Editor</div>,
  loader: {
    config: vi.fn(),
  },
}));

vi.mock('monaco-editor', () => ({}));

describe('WidgetTreeLab', () => {
  it('renders source, tree, and preview surfaces', () => {
    const markup = renderToStaticMarkup(
      <WidgetTreeLab
        assetCatalog={WIDGET_TREE_DEMO_ASSET_CATALOG}
        registry={WIDGET_TREE_DEMO_REGISTRY}
        value={WIDGET_TREE_WELCOME_DOCUMENT}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-testid="widget-tree-lab"');
    expect(markup).toContain('data-testid="widget-tree-source"');
    expect(markup).toContain('data-testid="monaco-editor"');
    expect(markup).toContain('role="tree"');
    expect(markup).toContain('data-testid="json-widget-preview-output"');
    expect(markup).toContain('data-testid="widget-tree-side-panel"');
    expect(markup).toContain('Assets');
    expect(markup).toContain('Widget Tree');
    expect(markup).toContain('data-widget-type="grid"');
  });
});
