import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor">Mocked Monaco Editor</div>,
  loader: {
    config: vi.fn(),
  },
}));

vi.mock('monaco-editor', () => ({}));

import { WidgetTreeWorkbench } from './WidgetTreeWorkbench.js';
import { WIDGET_TREE_DEMO_REGISTRY, WIDGET_TREE_WELCOME_DOCUMENT } from './demo-registry.js';
import { isWidgetTreeDocument } from './widget-tree-document.js';

describe('isWidgetTreeDocument', () => {
  it('matches widget mime type and .widget.json paths', () => {
    expect(
      isWidgetTreeDocument({
        path: 'src/widgets/home.widget.json',
        mimeType: 'application/vnd.workbench-kit.widget+json',
      }),
    ).toBe(true);
    expect(isWidgetTreeDocument({ path: 'layout.widget.json' })).toBe(true);
    expect(isWidgetTreeDocument({ path: 'package.json' })).toBe(false);
  });
});

describe('WidgetTreeWorkbench', () => {
  it('renders workbench chrome around the widget tree lab', () => {
    const markup = renderToStaticMarkup(
      <WidgetTreeWorkbench
        dirty
        path="src/widgets/home.widget.json"
        registry={WIDGET_TREE_DEMO_REGISTRY}
        value={WIDGET_TREE_WELCOME_DOCUMENT}
        onChange={() => undefined}
        onDiscard={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(markup).toContain('data-testid="widget-tree-workbench"');
    expect(markup).toContain('data-testid="widget-tree-lab"');
    expect(markup).toContain('data-mode="design"');
    expect(markup).toContain('label="Design"');
    expect(markup).toContain('label="Code"');
    expect(markup).toContain('Save');
    expect(markup).toContain('Discard');
  });
});
