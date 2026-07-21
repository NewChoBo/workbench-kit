import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { createWidgetStudioWorkspaceEditorRenderer } from './create-widget-studio-workspace-editor.js';
import { WIDGET_TREE_DEMO_REGISTRY } from '../widget-tree/demo-registry.js';
import { WIDGET_TREE_WELCOME_DOCUMENT } from '../widget-tree/demo-registry.js';

vi.mock('@workbench-kit/monaco', async () => {
  const { createWorkbenchMonacoMockModule } = await import('../test-utils/workbenchMonacoMock.js');
  return createWorkbenchMonacoMockModule();
});

describe('createWidgetStudioWorkspaceEditorRenderer', () => {
  const renderer = createWidgetStudioWorkspaceEditorRenderer({
    registry: WIDGET_TREE_DEMO_REGISTRY,
  });

  it('routes widget documents to the widget tree workbench', () => {
    const markup = renderToStaticMarkup(
      renderer({
        content: WIDGET_TREE_WELCOME_DOCUMENT,
        file: {
          path: 'src/widgets/home.jdw.json',
          mimeType: 'application/vnd.workbench-kit.jdw+json',
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
    const manifestSource = JSON.stringify({
      name: 'content.body',
      label: 'Body',
      category: 'content',
      kind: 'leaf',
    });

    const markup = renderToStaticMarkup(
      renderer({
        content: manifestSource,
        file: {
          path: 'src/widgets/assets/body/manifest.json',
          mimeType: 'application/vnd.workbench-kit.widget-asset-manifest+json',
          content: manifestSource,
        },
        isDirty: false,
        onChange: () => undefined,
        onDiscard: () => undefined,
        onSave: () => undefined,
        workspaceFiles: [
          {
            path: 'src/widgets/assets/body/manifest.json',
            mimeType: 'application/vnd.workbench-kit.widget-asset-manifest+json',
            content: manifestSource,
          },
          {
            path: 'src/widgets/assets/body/content.json',
            mimeType: 'application/vnd.workbench-kit.widget-asset-content+json',
            content: JSON.stringify({ type: 'text', args: { text: 'Body' } }),
          },
        ],
      }),
    );

    expect(markup).toContain('data-testid="widget-asset-workbench"');
  });
});
