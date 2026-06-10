import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { WorkspaceEditorPanel } from '../workbench/workspace/WorkspaceEditorPanel.js';
import { useVirtualWorkspace } from '../workbench/workspace/useVirtualWorkspace.js';
import { createWidgetStudioWorkspaceEditorRenderer } from '../widget-studio/create-widget-studio-workspace-editor.js';
import {
  WIDGET_TREE_DEMO_REGISTRY,
  WIDGET_TREE_WELCOME_DOCUMENT,
} from './demo-registry.js';
import {
  widgetStudioBuiltinAssetFiles,
  widgetStudioCustomAssetExampleFiles,
} from '@workbench-kit/adapters';
import { WIDGET_TREE_DOCUMENT_MIME } from './widget-tree-document.js';
import { waitForWidgetTreeSourcePane } from './widget-tree-play-helpers.js';

const widgetFixtureFiles = [
  {
    content: WIDGET_TREE_WELCOME_DOCUMENT,
    mimeType: WIDGET_TREE_DOCUMENT_MIME,
    path: 'src/widgets/home.widget.json',
  },
  ...widgetStudioBuiltinAssetFiles,
  ...widgetStudioCustomAssetExampleFiles,
  {
    content: 'export function App() { return null; }',
    mimeType: 'application/typescript',
    path: 'src/App.tsx',
  },
];

function WidgetTreeWorkspaceHarness() {
  const workspace = useVirtualWorkspace({
    files: widgetFixtureFiles,
    folders: [
      'src',
      'src/widgets',
      'src/widgets/assets',
      'src/widgets/assets/heading',
      'src/widgets/assets/custom',
      'src/widgets/assets/custom/feature-badge',
    ],
    openPaths: ['src/widgets/home.widget.json', 'src/App.tsx'],
    selectedPath: 'src/widgets/home.widget.json',
  });

  return (
    <div style={{ height: '100%', minHeight: 0 }}>
      <WorkspaceEditorPanel
        files={workspace.files}
        openPaths={workspace.openPaths}
        renderEditor={(context) =>
          createWidgetStudioWorkspaceEditorRenderer({
            registry: WIDGET_TREE_DEMO_REGISTRY,
          })({ ...context, workspaceFiles: workspace.files })
        }
        selectedPath={workspace.selectedPath}
        onClosePath={workspace.closePath}
        onSaveFile={(path, content) => {
          workspace.saveFile(path, { content, source: 'user' });
          return undefined;
        }}
        onSelectedPathChange={workspace.openFile}
      />
    </div>
  );
}

const meta = {
  title: 'JDW/WidgetTree/Workbench',
  parameters: {
    fullHeightShell: '720px',
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const WorkspaceEditor: Story = {
  render: () => <WidgetTreeWorkspaceHarness />,
  tags: ['storybook-play-baseline'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId('widget-tree-workbench')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-pressed', 'true');
    await waitForWidgetTreeSourcePane(canvasElement);
    await expect(canvas.getByTestId('jdw-preview-output')).toHaveTextContent('Widget Tree');
    await expect(canvas.getByRole('tab', { name: 'home.widget.json' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};
