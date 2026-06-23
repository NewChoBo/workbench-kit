import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { formatWidgetAssetContent, formatWidgetAssetManifest } from '@workbench-kit/jdw';

import { WidgetAssetEditor } from './WidgetAssetEditor.js';
import { WIDGET_TREE_DEMO_REGISTRY } from '../widget-tree/demo-registry.js';

vi.mock('@workbench-kit/monaco', async () => {
  const { createWorkbenchMonacoMockModule } = await import('../test-utils/workbenchMonacoMock.js');
  return createWorkbenchMonacoMockModule();
});

const packagePath = 'src/widgets/assets/heading';
const manifest = formatWidgetAssetManifest({
  id: 'content.heading',
  label: 'Heading',
  category: 'content',
  kind: 'leaf',
});
const content = formatWidgetAssetContent({
  type: 'text',
  text: 'Heading',
  fontSize: 24,
});

describe('WidgetAssetEditor', () => {
  it('renders dedicated asset design surfaces', () => {
    const markup = renderToStaticMarkup(
      <WidgetAssetEditor
        path={`${packagePath}/manifest.json`}
        registry={WIDGET_TREE_DEMO_REGISTRY}
        value={manifest}
        workspaceFiles={[
          { path: `${packagePath}/manifest.json`, content: manifest },
          { path: `${packagePath}/content.json`, content },
        ]}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('data-testid="widget-asset-editor"');
    expect(markup).toContain('Placement preview');
    expect(markup).toContain('Heading');
  });
});
