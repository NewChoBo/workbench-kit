import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { SideBarRow } from '../../layout/SideBarViewFrame';
import { WorkspaceEditorPanel } from './WorkspaceEditorPanel';
import { useVirtualWorkspace } from './useVirtualWorkspace';

const meta = {
  title: 'React/Workbench/WorkspaceEditorPanel',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const editorFixtureFiles = [
  {
    content: '# Project\n\nWorkspace notes.',
    mimeType: 'text/markdown',
    path: 'README.md',
  },
  {
    content: 'export function App() { return null; }',
    mimeType: 'application/typescript',
    path: 'src/App.tsx',
  },
  {
    content: 'export function Button() { return null; }',
    mimeType: 'application/typescript',
    path: 'src/components/Button.tsx',
  },
];

function EditorHarness() {
  const workspace = useVirtualWorkspace({
    files: editorFixtureFiles,
    folders: ['src', 'src/components'],
    openPaths: ['README.md', 'src/App.tsx', 'src/components/Button.tsx'],
    selectedPath: 'src/App.tsx',
  });
  const [status, setStatus] = useState('Ready');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr) auto',
        height: 'min(calc(100% - 96px), 680px)',
        width: 'min(100%, 920px)',
      }}
    >
      <WorkspaceEditorPanel
        files={workspace.files}
        openPaths={workspace.openPaths}
        selectedPath={workspace.selectedPath}
        onCloseAll={() => {
          workspace.closeAll();
          setStatus('Closed all files');
        }}
        onCloseOthers={(path) => {
          workspace.closeOthers(path);
          setStatus(`Closed other files except ${path}`);
        }}
        onClosePath={(path) => {
          workspace.closePath(path);
          setStatus(`Closed ${path}`);
        }}
        onCopyPath={(path) => setStatus(`Copied ${path}`)}
        onDeletePath={(path) => {
          workspace.deleteFile(path);
          setStatus(`Deleted ${path}`);
        }}
        onSaveFile={(path, content) => {
          workspace.saveFile(path, { content, source: 'user' });
          setStatus(`Saved ${path}`);
          return undefined;
        }}
        onSelectedPathChange={(path) => {
          workspace.openFile(path);
          setStatus(`Selected ${path}`);
        }}
      />
      <SideBarRow aria-label="Editor event log" role="status">
        {status}
      </SideBarRow>
    </div>
  );
}

export const ComponentSurface: Story = {
  render: () => <EditorHarness />,
};

export const OpenTabCoordinationFlow: Story = {
  render: () => <EditorHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('tab', { name: 'App.tsx' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await userEvent.click(canvas.getByRole('tab', { name: 'Button.tsx' }));
    await expect(canvas.getByRole('tab', { name: 'Button.tsx' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(canvas.getByLabelText('Editor event log')).toHaveTextContent(
      'Selected src/components/Button.tsx',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'Close Button.tsx' }));
    await expect(canvas.queryByRole('tab', { name: 'Button.tsx' })).toBeNull();
    await expect(canvas.getByRole('tab', { name: 'App.tsx' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(canvas.getByLabelText('Editor event log')).toHaveTextContent(
      'Closed src/components/Button.tsx',
    );

    await fireEvent.contextMenu(canvas.getByRole('tablist', { name: 'Open workspace files' }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Close all' }));

    await expect(canvas.queryByRole('tab', { name: 'README.md' })).toBeNull();
    await expect(canvas.queryByRole('tab', { name: 'App.tsx' })).toBeNull();
    await expect(canvas.getByText('Open a file from Explorer or Search.')).toBeVisible();
    await expect(canvas.getByLabelText('Editor event log')).toHaveTextContent('Closed all files');
  },
  tags: ['storybook-play-baseline'],
};

export const DeleteOpenTabRecoveryFlow: Story = {
  render: () => <EditorHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole('tab', { name: 'App.tsx' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await fireEvent.contextMenu(canvas.getByRole('tab', { name: 'App.tsx' }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Delete' }));
    const activeDeleteDialog = await canvas.findByRole('dialog', { name: 'Delete File' });
    await expect(activeDeleteDialog).toBeVisible();
    await expect(within(activeDeleteDialog).getByText('src/App.tsx')).toBeVisible();

    await userEvent.click(within(activeDeleteDialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(canvas.queryByRole('dialog', { name: 'Delete File' })).toBeNull());
    await expect(canvas.queryByRole('tab', { name: 'App.tsx' })).toBeNull();
    await expect(canvas.getByRole('tab', { name: 'Button.tsx' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(canvas.getByLabelText('Editor event log')).toHaveTextContent(
      'Deleted src/App.tsx',
    );

    await fireEvent.contextMenu(canvas.getByRole('tab', { name: 'README.md' }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Delete' }));
    const inactiveDeleteDialog = await canvas.findByRole('dialog', { name: 'Delete File' });
    await expect(inactiveDeleteDialog).toBeVisible();
    await expect(within(inactiveDeleteDialog).getByText('README.md')).toBeVisible();
    await userEvent.click(within(inactiveDeleteDialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(canvas.queryByRole('dialog', { name: 'Delete File' })).toBeNull());
    await expect(canvas.queryByRole('tab', { name: 'README.md' })).toBeNull();
    await expect(canvas.getByRole('tab', { name: 'Button.tsx' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(canvas.getByLabelText('Editor event log')).toHaveTextContent('Deleted README.md');
  },
  tags: ['storybook-play-baseline'],
};
