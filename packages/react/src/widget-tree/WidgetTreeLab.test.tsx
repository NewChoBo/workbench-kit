import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { formatJsonWidgetData, parseJsonWidgetData } from '@workbench-kit/jdw';

import { createWidgetTreeListenProblems, WidgetTreeLab } from './WidgetTreeLab.js';
import { WIDGET_TREE_DEMO_REGISTRY, WIDGET_TREE_WELCOME_DOCUMENT } from './demo-registry.js';
import { WIDGET_TREE_DEMO_ASSET_CATALOG } from './demo-widget-assets.js';

vi.mock('@workbench-kit/monaco', async () => {
  const { createWorkbenchMonacoMockModule } = await import('../test-utils/workbenchMonacoMock.js');
  return createWorkbenchMonacoMockModule();
});

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
    expect(markup).toContain('data-testid="widget-tree-lab-data-pane"');
    expect(markup).toContain('data-testid="widget-tree-lab-render-pane"');
    expect(markup).toContain('data-testid="jdw-preview-output"');
    expect(markup).toContain('data-testid="widget-tree-side-panel"');
    expect(markup).toContain('Assets');
    expect(markup).toContain('Widget Tree');
    expect(markup).toContain('data-widget-type="grid"');
  });

  it('creates non-blocking listen binding warnings for source problems', () => {
    const source = formatJsonWidgetData({
      type: 'column',
      listen: ['unused'],
      args: {
        gap: '${spacing}',
        children: [
          {
            type: 'text',
            listen: ['title'],
            args: { text: '${title}', fontSize: '${fontSize}' },
          },
        ],
      },
    });
    const parsed = parseJsonWidgetData(source);

    const problems = createWidgetTreeListenProblems(source, parsed.value!);

    expect(problems).toMatchObject([
      {
        message: 'root: listen is missing "spacing" for a dynamic value.',
        severity: 4,
        startLineNumber: 1,
      },
      {
        message: 'root: listen includes "unused" but this node does not reference it.',
        severity: 4,
        startLineNumber: 1,
      },
      {
        message: 'root.args.children[0]: listen is missing "fontSize" for a dynamic value.',
        severity: 4,
      },
    ]);
  });

  it('surfaces listen binding warnings in the source problem count', () => {
    const markup = renderToStaticMarkup(
      <WidgetTreeLab
        registry={WIDGET_TREE_DEMO_REGISTRY}
        value={JSON.stringify({
          type: 'column',
          listen: ['spacing'],
          args: {
            gap: '${spacing}',
            children: [{ type: 'text', args: { text: 'Dynamic', fontSize: '${fontSize}' } }],
          },
        })}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('1 Warning');
    expect(markup).toContain('data-status="warning"');
    expect(markup).toContain('data-testid="jdw-preview-output"');
  });
});
