import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { formatWidgetAssetJson } from '@workbench-kit/json-widget';

import { createWidgetStudioWorkspaceEditorRenderer } from './create-widget-studio-workspace-editor.js';
import { WIDGET_TREE_DEMO_REGISTRY } from '../widget-tree/demo-registry.js';
import { WIDGET_TREE_WELCOME_DOCUMENT } from '../widget-tree/demo-registry.js';

vi.mock('@monaco-editor/react', () => ({
  default: () => <div data-testid="monaco-editor">Mocked Monaco Editor</div>,
  loader: {
    config: vi.fn(),
  },
}));

vi.mock('monaco-editor', () => ({}));

describe('createWidgetStudioWorkspaceEditorRenderer', () => {
  const renderer = createWidgetStudioWorkspaceEditorRenderer({
    registry: WIDGET_TREE_DEMO_REGISTRY,
  });

  it('routes widget documents to the widget tree workbench', () => {
    const markup = renderToStaticMarkup(
      renderer({
        content: WIDGET_TREE_WELCOME_DOCUMENT,
        file: {
          path: 'src/widgets/home.widget.json',
          mimeType: 'application/vnd.workbench-kit.widget+json',
          content: WIDGET_TREE_WELCOME_DOCUMENT,
        },
        isDirty: false,
        onChange: () => undefined,
        onDiscard: () => undefined,
        onSave: () => undefined,
        workspaceFiles: [],
      }),
    );

    expect(markup).toContain('data-testid="widget-tree-workbench"');
  });

  it('routes asset documents to the widget asset workbench', () => {
    const assetSource = formatWidgetAssetJson({
      id: 'content.body',
      label: 'Body',
      category: 'content',
      widgetType: 'text',
      defaultWidget: { type: 'text', text: 'Body' },
    });

    const markup = renderToStaticMarkup(
      renderer({
        content: assetSource,
        file: {
          path: 'src/widgets/assets/body.asset.json',
          mimeType: 'application/vnd.workbench-kit.widget-asset+json',
          content: assetSource,
        },
        isDirty: false,
        onChange: () => undefined,
        onDiscard: () => undefined,
        onSave: () => undefined,
        workspaceFiles: [
          {
            path: 'src/widgets/assets/body.asset.json',
            mimeType: 'application/vnd.workbench-kit.widget-asset+json',
            content: assetSource,
          },
        ],
      }),
    );

    expect(markup).toContain('data-testid="widget-asset-workbench"');
  });
});
