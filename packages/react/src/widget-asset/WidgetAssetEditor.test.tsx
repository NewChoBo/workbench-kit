import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { formatWidgetAssetJson } from '@workbench-kit/json-widget';

import { WidgetAssetEditor } from './WidgetAssetEditor.js';
import { WIDGET_TREE_DEMO_REGISTRY } from '../widget-tree/demo-registry.js';

vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor">Mocked Monaco Editor</div>,
  loader: {
    config: vi.fn(),
  },
}));

vi.mock('monaco-editor', () => ({}));

const sampleAsset = formatWidgetAssetJson({
  id: 'content.heading',
  label: 'Heading',
  category: 'content',
  widgetType: 'text',
  defaultWidget: {
    type: 'text',
    text: 'Heading',
    fontSize: 24,
  },
});

describe('WidgetAssetEditor', () => {
  it('renders dedicated asset design surfaces', () => {
    const markup = renderToStaticMarkup(
      <WidgetAssetEditor
        registry={WIDGET_TREE_DEMO_REGISTRY}
        value={sampleAsset}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-testid="widget-asset-editor"');
    expect(markup).toContain('Placement preview');
    expect(markup).toContain('Heading');
  });
});
