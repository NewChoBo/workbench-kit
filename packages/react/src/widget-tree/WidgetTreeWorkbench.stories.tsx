import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { WorkspaceEditorPanel } from '../workbench/workspace/WorkspaceEditorPanel.js';
import { useVirtualWorkspace } from '../workbench/workspace/useVirtualWorkspace.js';
import { createWidgetStudioWorkspaceEditorRenderer } from '../widget-studio/create-widget-studio-workspace-editor.js';
import {
  WIDGET_TREE_DEMO_REGISTRY,
  WIDGET_TREE_WELCOME_DOCUMENT,
} from './demo-registry.js';
import { widgetStudioAssetFiles } from '@workbench-kit/adapters';
import { WIDGET_TREE_DOCUMENT_MIME } from './widget-tree-document.js';
import {
  setWidgetTreeSourceJson,
  waitForWidgetTreeMonaco,
  waitForWidgetTreeSourcePane,
} from './widget-tree-play-helpers.js';

const widgetFixtureFiles = [
  {
    content: WIDGET_TREE_WELCOME_DOCUMENT,
    mimeType: WIDGET_TREE_DOCUMENT_MIME,
    path: 'src/widgets/home.widget.json',
  },
  ...widgetStudioAssetFiles,
  {
    content: 'export function App() { return null; }',
    mimeType: 'application/typescript',
    path: 'src/App.tsx',
  },
];

function WidgetTreeWorkspaceHarness() {
  const workspace = useVirtualWorkspace({
    files: widgetFixtureFiles,
    folders: ['src', 'src/widgets'],
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
  title: 'JsonWidget/WidgetTree/Workbench',
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
    await expect(canvas.getByRole('button', { name: 'Split' })).toHaveAttribute('aria-pressed', 'true');
    await waitForWidgetTreeSourcePane(canvasElement);
    await expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('Welcome');

    const monacoRoot = canvasElement.querySelector('.widget-tree-source .monaco-editor');
    if (monacoRoot) {
      await waitForWidgetTreeMonaco(canvasElement);
      await setWidgetTreeSourceJson(
        canvasElement,
        '{"type":"column","children":[{"type":"text","text":"Workbench"}]}',
      );

      await waitFor(() =>
        expect(canvas.getByTestId('json-widget-preview-output')).toHaveTextContent('Workbench'),
      );
      await expect(canvas.getByRole('button', { name: 'Save' })).toBeVisible();
    }
  },
};
