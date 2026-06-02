import { useState, type MouseEvent } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import {
  getAvailableWorkspaceEntryName,
  getWorkspaceFileMovePlan,
  isSimpleWorkspaceName,
  isWorkspaceEntryPathAvailable,
  joinWorkspacePath,
  parentPathOf,
  type WorkspaceSelectionState,
  type WorkspaceTreeNode,
} from '@newchobo-ui/workspace';
import { SideBarViewFrame } from '../../layout/SideBarViewFrame';
import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import { IconButton } from '../../primitives/IconButton';
import { Toolbar } from '../../primitives/Toolbar';
import { WorkspaceExplorer } from './WorkspaceExplorer';
import type {
  WorkspaceExplorerInlineEditCommitMeta,
  WorkspaceExplorerInlineEditKind,
  WorkspaceExplorerInlineEditState,
  WorkspaceExplorerItemKeyboardActionMeta,
  WorkspaceExplorerMoveRequestMeta,
} from './WorkspaceExplorer';
import { useVirtualWorkspace } from './useVirtualWorkspace';

const meta = {
  title: 'React/Workbench/WorkspaceExplorer',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const fixtureFiles = [
  {
    content: 'Project notes and setup instructions.',
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
  {
    content: 'Getting started guide.',
    mimeType: 'text/markdown',
    path: 'docs/intro.md',
  },
];

const fixtureFolders = ['docs', 'src', 'src/components'];

interface StoryContextMenuState {
  items: ContextMenuItem[];
  x: number;
  y: number;
}

interface ExplorerHarnessProps {
  statusLabel?: string;
}

function ExplorerHarness({ statusLabel = 'Ready' }: ExplorerHarnessProps) {
  const workspace = useVirtualWorkspace({
    expandedPaths: ['docs', 'src', 'src/components'],
    files: fixtureFiles,
    folders: fixtureFolders,
    openPaths: ['src/App.tsx'],
    selectedPath: 'src/App.tsx',
  });
  const [selection, setSelection] = useState<WorkspaceSelectionState>({
    anchorPath: 'src/App.tsx',
    paths: ['src/App.tsx'],
  });
  const [inlineEdit, setInlineEdit] = useState<WorkspaceExplorerInlineEditState | undefined>();
  const [contextMenu, setContextMenu] = useState<StoryContextMenuState | null>(null);
  const [status, setStatus] = useState(statusLabel);

  const setInlineEditError = (
    edit: WorkspaceExplorerInlineEditState,
    error: WorkspaceExplorerInlineEditState['error'],
  ) => {
    setInlineEdit({ ...edit, error });
    setStatus(String(error));
  };

  const startCreate = (
    kind: Extract<WorkspaceExplorerInlineEditKind, 'create-file' | 'create-folder'>,
    parentPath = '',
  ) => {
    const value = getAvailableWorkspaceEntryName({
      files: workspace.files,
      folders: workspace.folders,
      parentPath,
      preferredName: kind === 'create-file' ? 'untitled.md' : 'new-folder',
    });

    if (parentPath && !workspace.expandedPaths.has(parentPath)) {
      workspace.toggleFolder(parentPath);
    }

    setContextMenu(null);
    setInlineEdit({
      id: `${kind}:${parentPath}:${workspace.files.length}:${workspace.folders.length}`,
      kind,
      parentPath,
      value,
    });
    setStatus(kind === 'create-file' ? 'New file queued' : 'New folder queued');
  };

  const startRename = (node: WorkspaceTreeNode, actionPaths: string[]) => {
    if (actionPaths.length !== 1) return;

    setContextMenu(null);
    setInlineEdit({
      id: `rename:${node.path}`,
      kind: node.type === 'folder' ? 'rename-folder' : 'rename-file',
      path: node.path,
      value: node.name,
    });
    setStatus(`Rename queued for ${node.path}`);
  };

  const deleteNode = (node: WorkspaceTreeNode, actionPaths: string[]) => {
    setContextMenu(null);

    if (node.type === 'folder') {
      const deletedPaths = workspace.files
        .filter((file) => isUnderWorkspacePath(file.path, node.path))
        .map((file) => file.path);

      workspace.deleteFolder(node.path);
      setSelection((current) => ({
        anchorPath:
          current.anchorPath && deletedPaths.includes(current.anchorPath)
            ? undefined
            : current.anchorPath,
        paths: current.paths.filter((path) => !deletedPaths.includes(path)),
      }));
      setStatus(`Deleted folder ${node.path}`);
      return;
    }

    const paths = actionPaths.length > 0 ? actionPaths : [node.path];
    paths.forEach(workspace.deleteFile);
    setSelection((current) => ({
      anchorPath:
        current.anchorPath && paths.includes(current.anchorPath) ? undefined : current.anchorPath,
      paths: current.paths.filter((path) => !paths.includes(path)),
    }));
    setStatus(paths.length === 1 ? `Deleted ${paths[0]}` : `Deleted ${paths.length} files`);
  };

  const handleInlineEditValueChange = (value: string, edit: WorkspaceExplorerInlineEditState) => {
    setInlineEdit({ ...edit, error: undefined, value });
  };

  const handleInlineEditCommit = ({ edit, value }: WorkspaceExplorerInlineEditCommitMeta) => {
    const name = value.trim();
    if (!isSimpleWorkspaceName(name)) {
      setInlineEditError(edit, 'Use a simple file or folder name.');
      return;
    }

    if (edit.kind === 'create-file' || edit.kind === 'create-folder') {
      const path = joinWorkspacePath(edit.parentPath ?? '', name);
      if (
        !isWorkspaceEntryPathAvailable({
          files: workspace.files,
          folders: workspace.folders,
          path,
        })
      ) {
        setInlineEditError(edit, 'A file or folder already uses this name.');
        return;
      }

      if (edit.kind === 'create-file') {
        workspace.createFile({ content: '', path });
        setSelection({ anchorPath: path, paths: [path] });
        setStatus(`Created ${path}`);
      } else {
        workspace.createFolder(path);
        setStatus(`Created folder ${path}`);
      }
      setInlineEdit(undefined);
      return;
    }

    const sourcePath = edit.path;
    if (!sourcePath) return;

    const destinationPath = joinWorkspacePath(parentPathOf(sourcePath), name);
    if (
      !isWorkspaceEntryPathAvailable({
        excludedPaths: [sourcePath],
        files: workspace.files,
        folders: workspace.folders,
        path: destinationPath,
      })
    ) {
      setInlineEditError(edit, 'A file or folder already uses this name.');
      return;
    }

    if (edit.kind === 'rename-file') {
      workspace.renameFile(sourcePath, name);
      setSelection((current) => ({
        anchorPath: current.anchorPath === sourcePath ? destinationPath : current.anchorPath,
        paths: current.paths.map((path) => (path === sourcePath ? destinationPath : path)),
      }));
      setStatus(`Renamed ${sourcePath} to ${destinationPath}`);
      setInlineEdit(undefined);
      return;
    }

    workspace.renameFolder(sourcePath, name);
    setSelection((current) => ({
      anchorPath: current.anchorPath
        ? renameDescendantPath(current.anchorPath, sourcePath, destinationPath)
        : undefined,
      paths: current.paths.map((path) => renameDescendantPath(path, sourcePath, destinationPath)),
    }));
    setStatus(`Renamed ${sourcePath} to ${destinationPath}`);
    setInlineEdit(undefined);
  };

  const handleKeyboardDelete = (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
    deleteNode(meta.node, meta.actionPaths);
  };

  const handleKeyboardRename = (meta: WorkspaceExplorerItemKeyboardActionMeta) => {
    startRename(meta.node, meta.actionPaths);
  };

  const handleMove = ({ sourcePaths, targetFolderPath }: WorkspaceExplorerMoveRequestMeta) => {
    const plan = getWorkspaceFileMovePlan({
      files: workspace.files,
      folders: workspace.folders,
      sourcePaths,
      targetFolderPath,
    });

    plan.moves.forEach(({ sourcePath }) => workspace.moveFile(sourcePath, targetFolderPath));
    setSelection({
      anchorPath: plan.moves[0]?.destinationPath,
      paths: plan.moves.map((move) => move.destinationPath),
    });
    setStatus(
      plan.moves.length === 1
        ? `Moved ${plan.moves[0]?.sourcePath} to ${plan.moves[0]?.destinationPath}`
        : `Moved ${plan.moves.length} files to ${targetFolderPath || 'root'}`,
    );
  };

  const openItemContextMenu = (
    event: MouseEvent<HTMLButtonElement>,
    node: WorkspaceTreeNode,
    actionPaths: string[],
  ) => {
    event.preventDefault();

    const items: ContextMenuItem[] = [];
    if (node.type === 'folder') {
      items.push(
        {
          icon: 'codicon-new-file',
          id: 'new-file',
          label: 'New file',
          onSelect: () => startCreate('create-file', node.path),
        },
        {
          icon: 'codicon-new-folder',
          id: 'new-folder',
          label: 'New folder',
          onSelect: () => startCreate('create-folder', node.path),
        },
        { id: 'create-separator', type: 'separator' },
      );
    }

    items.push(
      {
        disabled: actionPaths.length !== 1,
        icon: 'codicon-edit',
        id: 'rename',
        label: 'Rename',
        shortcut: 'F2',
        onSelect: () => startRename(node, actionPaths),
      },
      {
        danger: true,
        icon: 'codicon-trash',
        id: 'delete',
        label: actionPaths.length > 1 ? `Delete ${actionPaths.length} files` : 'Delete',
        shortcut: 'Del',
        onSelect: () => deleteNode(node, actionPaths),
      },
    );

    setContextMenu({
      items,
      x: event.clientX,
      y: event.clientY,
    });
  };

  return (
    <div className="workspace-explorer-story">
      <SideBarViewFrame
        title="Explorer"
        actions={
          <Toolbar>
            <IconButton
              icon="codicon-new-file"
              label="New file"
              onClick={() => startCreate('create-file')}
            />
            <IconButton
              icon="codicon-new-folder"
              label="New folder"
              onClick={() => startCreate('create-folder')}
            />
          </Toolbar>
        }
        footer={
          <div aria-label="Explorer event log" role="status">
            {status}
          </div>
        }
        style={{ height: 480, width: 320 }}
      >
        <WorkspaceExplorer
          activePath={workspace.selectedPath}
          expandedPaths={workspace.expandedPaths}
          inlineEdit={inlineEdit}
          nodes={workspace.workspaceTree}
          selectedPaths={selection.paths}
          selectionAnchorPath={selection.anchorPath}
          onActivateFile={(path) => {
            workspace.openFile(path);
            setStatus(`Opened ${path}`);
          }}
          onInlineEditCancel={() => {
            setInlineEdit(undefined);
            setStatus('Inline edit canceled');
          }}
          onInlineEditCommit={handleInlineEditCommit}
          onInlineEditValueChange={handleInlineEditValueChange}
          onItemContextMenu={(event, node, meta) =>
            openItemContextMenu(event, node, meta.actionPaths)
          }
          onRequestDelete={handleKeyboardDelete}
          onRequestMove={handleMove}
          onRequestRename={handleKeyboardRename}
          onSelectionChange={(nextSelection) => setSelection(nextSelection)}
          onToggleFolder={workspace.toggleFolder}
        />
      </SideBarViewFrame>
      {contextMenu ? (
        <ContextMenu
          ariaLabel="Explorer item menu"
          items={contextMenu.items}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      ) : null}
    </div>
  );
}

export const ComponentSurface: Story = {
  render: () => <ExplorerHarness />,
};

export const CreateAndRenameFlow: Story = {
  render: () => <ExplorerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'New file' }));
    const rootInput = await canvas.findByLabelText('Workspace item name');
    await expect(rootInput).toHaveValue('untitled.md');
    await userEvent.clear(rootInput);
    await userEvent.type(rootInput, 'notes.md');
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByRole('button', { name: 'notes.md' })).toBeVisible();
    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent('Created notes.md');

    await fireEvent.contextMenu(canvas.getByRole('button', { name: 'docs' }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'New file' }));
    const nestedInput = await canvas.findByLabelText('Workspace item name');
    await expect(nestedInput).toHaveValue('untitled.md');
    await userEvent.clear(nestedInput);
    await userEvent.type(nestedInput, 'guide.md');
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByRole('button', { name: 'guide.md' })).toBeVisible();
    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Created docs/guide.md',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'App.tsx' }));
    await userEvent.keyboard('{F2}');
    const renameInput = await canvas.findByLabelText('Workspace item name');
    await expect(renameInput).toHaveValue('App.tsx');
    await userEvent.clear(renameInput);
    await userEvent.type(renameInput, 'Main.tsx');
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByRole('button', { name: 'Main.tsx' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'App.tsx' })).toBeNull();
    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Renamed src/App.tsx to src/Main.tsx',
    );
  },
};

export const DeleteAndDragDropFlow: Story = {
  render: () => <ExplorerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'Button.tsx' }));
    await userEvent.keyboard('{Delete}');
    await expect(canvas.queryByRole('button', { name: 'Button.tsx' })).toBeNull();
    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Deleted src/components/Button.tsx',
    );

    await userEvent.click(canvas.getByRole('button', { name: 'README.md' }));
    await fireEvent.click(canvas.getByRole('button', { name: 'App.tsx' }), { ctrlKey: true });
    await waitFor(async () => {
      await expect(canvas.getByRole('button', { name: 'README.md' })).toHaveAttribute(
        'data-selected',
        'true',
      );
      await expect(canvas.getByRole('button', { name: 'App.tsx' })).toHaveAttribute(
        'data-selected',
        'true',
      );
    });

    const dataTransfer = createStoryDataTransfer();
    await fireEvent.dragStart(canvas.getByRole('button', { name: 'App.tsx' }), { dataTransfer });
    await fireEvent.dragOver(canvas.getByRole('button', { name: 'docs' }), { dataTransfer });
    await fireEvent.drop(canvas.getByRole('button', { name: 'docs' }), { dataTransfer });

    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Moved 2 files to docs',
    );
    await expect(await canvas.findByRole('button', { name: 'README.md' })).toHaveAttribute(
      'data-selected',
      'true',
    );
    await expect(await canvas.findByRole('button', { name: 'App.tsx' })).toHaveAttribute(
      'data-selected',
      'true',
    );
  },
};

export const RootDropFlow: Story = {
  render: () => <ExplorerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const workspaceRoot = canvas.getByRole('list', { name: 'Workspace files' });
    const docsIntro = canvas.getByRole('button', { name: 'intro.md' });

    const rootDropDataTransfer = createStoryDataTransfer();
    await fireEvent.dragStart(docsIntro, { dataTransfer: rootDropDataTransfer });
    await fireEvent.dragOver(workspaceRoot, { dataTransfer: rootDropDataTransfer });
    await fireEvent.drop(workspaceRoot, { dataTransfer: rootDropDataTransfer });

    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Moved docs/intro.md to intro.md',
    );
    await expect(await canvas.findByRole('button', { name: 'intro.md' })).toHaveAttribute(
      'data-selected',
      'true',
    );

    const invalidDropDataTransfer = createStoryDataTransfer();
    await fireEvent.dragStart(canvas.getByRole('button', { name: 'intro.md' }), {
      dataTransfer: invalidDropDataTransfer,
    });
    await fireEvent.dragOver(workspaceRoot, { dataTransfer: invalidDropDataTransfer });
    await fireEvent.drop(workspaceRoot, { dataTransfer: invalidDropDataTransfer });

    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Moved docs/intro.md to intro.md',
    );
    await expect(canvas.getByLabelText('Explorer event log')).not.toHaveTextContent(
      'Moved intro.md to intro.md',
    );
  },
};

function isUnderWorkspacePath(path: string, parentPath: string) {
  return path === parentPath || path.startsWith(`${parentPath}/`);
}

function renameDescendantPath(path: string, sourcePath: string, destinationPath: string) {
  if (!isUnderWorkspacePath(path, sourcePath)) return path;
  return path === sourcePath
    ? destinationPath
    : `${destinationPath}/${path.slice(sourcePath.length + 1)}`;
}

function createStoryDataTransfer(): DataTransfer {
  if (typeof DataTransfer !== 'undefined') return new DataTransfer();

  const data = new Map<string, string>();
  return {
    clearData: (format?: string) => {
      if (format) {
        data.delete(format);
      } else {
        data.clear();
      }
    },
    dropEffect: 'none',
    effectAllowed: 'all',
    files: [] as unknown as FileList,
    getData: (format: string) => data.get(format) ?? '',
    items: [] as unknown as DataTransferItemList,
    setData: (format: string, value: string) => {
      data.set(format, value);
    },
    setDragImage: () => undefined,
    types: [],
  };
}
