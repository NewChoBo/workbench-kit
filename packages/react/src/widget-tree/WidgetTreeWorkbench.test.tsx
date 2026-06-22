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
import { JDW_WIDGET_DOCUMENT_MIME } from '../jdw/document.js';

describe('isWidgetTreeDocument', () => {
  it('matches canonical JDW mime type and .jdw.json paths', () => {
    expect(
      isWidgetTreeDocument({
        path: 'src/widgets/home.jdw.json',
        mimeType: JDW_WIDGET_DOCUMENT_MIME,
      }),
    ).toBe(true);
    expect(isWidgetTreeDocument({ path: 'layout.widget.json' })).toBe(false);
    expect(isWidgetTreeDocument({ path: 'jdw/home.jdw.json' })).toBe(true);
    expect(
      isWidgetTreeDocument({ path: 'jdw/home.json', mimeType: JDW_WIDGET_DOCUMENT_MIME }),
    ).toBe(true);
    expect(isWidgetTreeDocument({ path: 'package.json' })).toBe(false);
  });
});

describe('WidgetTreeWorkbench', () => {
  it('renders workbench chrome around the widget tree lab', () => {
    const markup = renderToStaticMarkup(
      <WidgetTreeWorkbench
        dirty
        path="src/widgets/home.jdw.json"
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
