import { useState, type MouseEvent } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import {
  getAvailableWorkspaceEntryName,
  getWorkspaceEntryMovePlan,
  isSimpleWorkspaceName,
  isWorkspaceEntryPathAvailable,
  joinWorkspacePath,
  parentPathOf,
  resolveWorkspaceCreateParentPath,
  type WorkspaceEntryMove,
  type WorkspaceSelectionState,
  type WorkspaceFile,
  type WorkspaceTreeNode,
} from '@workbench-kit/workspace';
import { SideBarViewFrame } from '../../layout/SideBarViewFrame';
import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import { IconButton } from '../../primitives/IconButton';
import { Toolbar } from '../../primitives/Toolbar';
import {
  WORKSPACE_EXPLORER_DRAG_DATA_TYPE,
  WORKSPACE_EXPLORER_DRAG_METADATA_DATA_TYPE,
  WorkspaceExplorer,
  type WorkspaceExplorerDragMetadataContext,
  type WorkspaceExplorerMoveRequestMeta,
} from './WorkspaceExplorer';
import type {
  WorkspaceExplorerInlineEditCommitMeta,
  WorkspaceExplorerInlineEditKind,
  WorkspaceExplorerInlineEditState,
  WorkspaceExplorerItemKeyboardActionMeta,
} from './WorkspaceExplorer';
import { useVirtualWorkspace } from './useVirtualWorkspace';
import { StorySidebarFrame } from '../story/StorySidebarFrame';

const meta = {
  title: 'React/Workbench/Workspace/WorkspaceExplorer',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const fixtureFiles: WorkspaceFile[] = [
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

const pathConflictFixtureFiles: WorkspaceFile[] = [
  ...fixtureFiles,
  {
    content: 'Existing button example.',
    mimeType: 'application/typescript',
    path: 'docs/Button.tsx',
  },
];

const nameSuggestionFixtureFiles: WorkspaceFile[] = [
  ...fixtureFiles,
  {
    content: 'Existing untitled note.',
    mimeType: 'text/markdown',
    path: 'untitled.md',
  },
];

const nameSuggestionFixtureFolders = [...fixtureFolders, 'new-folder'];

interface StoryContextMenuState {
  items: ContextMenuItem[];
  x: number;
  y: number;
}

interface ExplorerHarnessProps {
  expandedPaths?: string[];
  files?: WorkspaceFile[];
  folders?: string[];
  openPaths?: string[];
  dragMetadataDataType?: string;
  dragMetadataFactory?: (meta: WorkspaceExplorerDragMetadataContext) => unknown;
  selectedPath?: string;
  statusLabel?: string;
}

function ExplorerHarness({
  expandedPaths = ['docs', 'src', 'src/components'],
  files = fixtureFiles,
  folders = fixtureFolders,
  openPaths = ['src/App.tsx'],
  dragMetadataDataType = WORKSPACE_EXPLORER_DRAG_METADATA_DATA_TYPE,
  dragMetadataFactory,
  selectedPath = 'src/App.tsx',
  statusLabel = 'Ready',
}: ExplorerHarnessProps) {
  const workspace = useVirtualWorkspace({
    expandedPaths,
    files,
    folders,
    openPaths,
    selectedPath,
  });
  const [selection, setSelection] = useState<WorkspaceSelectionState>({
    anchorPath: selectedPath,
    focusedPath: selectedPath,
    paths: selectedPath ? [selectedPath] : [],
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
    const plan = getWorkspaceEntryMovePlan({
      files: workspace.files,
      folders: workspace.folders,
      sourcePaths,
      targetFolderPath,
    });

    if (plan.moves.length === 0) {
      setStatus(
        plan.blockedPaths.length === 1
          ? `Move blocked for ${plan.blockedPaths[0]}`
          : `Move blocked for ${plan.blockedPaths.length} files`,
      );
      return;
    }

    plan.moves.forEach(({ kind, sourcePath }) => {
      if (kind === 'folder') {
        workspace.moveFolder(sourcePath, targetFolderPath);
        return;
      }

      workspace.moveFile(sourcePath, targetFolderPath);
    });
    const fileMoves = plan.moves.filter((move) => move.kind === 'file');
    setSelection({
      anchorPath: fileMoves[0]?.destinationPath,
      paths: fileMoves.map((move) => move.destinationPath),
    });
    setStatus(formatMoveStatus(plan.moves, targetFolderPath));
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
    <StorySidebarFrame variant="workspace">
      <SideBarViewFrame
        title="Explorer"
        actions={
          <Toolbar>
            <IconButton
              icon="codicon-new-file"
              label="New file"
              onClick={() =>
                startCreate(
                  'create-file',
                  resolveWorkspaceCreateParentPath(selection.focusedPath, workspace.folders),
                )
              }
            />
            <IconButton
              icon="codicon-new-folder"
              label="New folder"
              onClick={() =>
                startCreate(
                  'create-folder',
                  resolveWorkspaceCreateParentPath(selection.focusedPath, workspace.folders),
                )
              }
            />
          </Toolbar>
        }
        footer={
          <div aria-label="Explorer event log" role="status">
            {status}
          </div>
        }
      >
        <WorkspaceExplorer
          activePath={workspace.selectedPath}
          dragMetadataDataType={dragMetadataDataType}
          dragMetadataFactory={dragMetadataFactory}
          expandedPaths={workspace.expandedPaths}
          focusedPath={selection.focusedPath}
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
    </StorySidebarFrame>
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
    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Created src/notes.md',
    );

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
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};

export const InlineEditBoundaryFlow: Story = {
  render: () => <ExplorerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const eventLog = canvas.getByLabelText('Explorer event log');

    await userEvent.click(canvas.getByRole('button', { name: 'New folder' }));
    const canceledFolderInput = await canvas.findByLabelText('Workspace item name');
    await expect(canceledFolderInput).toHaveValue('new-folder');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByLabelText('Workspace item name')).toBeNull());
    await expect(canvas.queryByRole('button', { name: 'new-folder' })).toBeNull();
    await expect(eventLog).toHaveTextContent('Inline edit canceled');

    await userEvent.click(canvas.getByRole('button', { name: 'New folder' }));
    const rootFolderInput = await canvas.findByLabelText('Workspace item name');
    await userEvent.clear(rootFolderInput);
    await userEvent.type(rootFolderInput, 'assets');
    await userEvent.tab();
    await expect(await canvas.findByRole('button', { name: 'assets' })).toBeVisible();
    await expect(eventLog).toHaveTextContent('Created folder assets');

    await fireEvent.contextMenu(canvas.getByRole('button', { name: 'docs' }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'New folder' }));
    const nestedFolderInput = await canvas.findByLabelText('Workspace item name');
    await userEvent.clear(nestedFolderInput);
    await userEvent.type(nestedFolderInput, 'guides');
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByRole('button', { name: 'guides' })).toBeVisible();
    await expect(eventLog).toHaveTextContent('Created folder docs/guides');

    await userEvent.click(canvas.getByRole('button', { name: 'App.tsx' }));
    await userEvent.keyboard('{F2}');
    const canceledRenameInput = await canvas.findByLabelText('Workspace item name');
    await expect(canceledRenameInput).toHaveValue('App.tsx');
    await userEvent.clear(canceledRenameInput);
    await userEvent.type(canceledRenameInput, 'Draft.tsx');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByLabelText('Workspace item name')).toBeNull());
    await expect(canvas.getByRole('button', { name: 'App.tsx' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Draft.tsx' })).toBeNull();
    await expect(eventLog).toHaveTextContent('Inline edit canceled');

    await userEvent.click(canvas.getByRole('button', { name: 'App.tsx' }));
    await userEvent.keyboard('{F2}');
    const blurRenameInput = await canvas.findByLabelText('Workspace item name');
    await userEvent.clear(blurRenameInput);
    await userEvent.type(blurRenameInput, 'Main.tsx');
    await userEvent.tab();
    await expect(await canvas.findByRole('button', { name: 'Main.tsx' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'App.tsx' })).toBeNull();
    await expect(eventLog).toHaveTextContent('Renamed src/App.tsx to src/Main.tsx');
  },
};

export const InlineValidationFlow: Story = {
  render: () => <ExplorerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const eventLog = canvas.getByLabelText('Explorer event log');

    await userEvent.click(canvas.getByRole('button', { name: 'New file' }));
    const input = await canvas.findByLabelText('Workspace item name');

    await userEvent.clear(input);
    await userEvent.type(input, 'nested/file.md');
    await userEvent.keyboard('{Enter}');
    await expect(eventLog).toHaveTextContent('Use a simple file or folder name.');
    await expect(input).toHaveValue('nested/file.md');

    await userEvent.clear(input);
    await userEvent.type(input, 'README.md');
    await userEvent.keyboard('{Enter}');
    await expect(eventLog).toHaveTextContent('A file or folder already uses this name.');
    await expect(input).toHaveValue('README.md');

    await userEvent.clear(input);
    await userEvent.type(input, 'notes.md');
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByRole('button', { name: 'notes.md' })).toBeVisible();
    await expect(eventLog).toHaveTextContent('Created notes.md');
  },
};

export const InlineNameSuggestionFlow: Story = {
  render: () => (
    <ExplorerHarness files={nameSuggestionFixtureFiles} folders={nameSuggestionFixtureFolders} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: 'New file' }));
    const fileInput = await canvas.findByLabelText('Workspace item name');
    await expect(fileInput).toHaveValue('untitled-2.md');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByLabelText('Workspace item name')).toBeNull());

    await userEvent.click(canvas.getByRole('button', { name: 'New folder' }));
    const folderInput = await canvas.findByLabelText('Workspace item name');
    await expect(folderInput).toHaveValue('new-folder-2');
  },
};

export const FolderRenameValidationFlow: Story = {
  render: () => <ExplorerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const eventLog = canvas.getByLabelText('Explorer event log');

    await fireEvent.contextMenu(canvas.getByRole('button', { name: 'src' }));
    await userEvent.click(await canvas.findByText('Rename'));
    const conflictInput = await canvas.findByLabelText('Workspace item name');
    await expect(conflictInput).toHaveValue('src');
    await userEvent.clear(conflictInput);
    await userEvent.type(conflictInput, 'docs');
    await userEvent.keyboard('{Enter}');
    await expect(eventLog).toHaveTextContent('A file or folder already uses this name.');
    await expect(conflictInput).toHaveValue('docs');

    await userEvent.clear(conflictInput);
    await userEvent.type(conflictInput, 'source');
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByRole('button', { name: 'source' })).toBeVisible();
    await expect(getWorkspaceItem(canvasElement, 'source/App.tsx')).toBeVisible();
    await expect(getWorkspaceItem(canvasElement, 'source/components/Button.tsx')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'src' })).toBeNull();
    await expect(eventLog).toHaveTextContent('Renamed src to source');
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

export const FolderDragDropFlow: Story = {
  render: () => <ExplorerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const docsFolder = canvas.getByRole('button', { name: 'docs' });
    const componentsFolder = getWorkspaceItem(canvasElement, 'src/components');

    const dataTransfer = createStoryDataTransfer();
    await fireEvent.dragStart(componentsFolder, { dataTransfer });
    await fireEvent.dragOver(docsFolder, { dataTransfer });
    await fireEvent.drop(docsFolder, { dataTransfer });

    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Moved folder src/components to docs/components',
    );
    await expect(getWorkspaceItem(canvasElement, 'docs/components')).toBeVisible();
    await expect(getWorkspaceItem(canvasElement, 'docs/components/Button.tsx')).toBeVisible();
    expect(canvasElement.querySelector('[data-workspace-path="src/components"]')).toBeNull();

    const blockedDataTransfer = createStoryDataTransfer();
    await fireEvent.dragStart(canvas.getByRole('button', { name: 'docs' }), {
      dataTransfer: blockedDataTransfer,
    });
    await fireEvent.dragOver(canvas.getByRole('button', { name: 'components' }), {
      dataTransfer: blockedDataTransfer,
    });
    await fireEvent.drop(canvas.getByRole('button', { name: 'components' }), {
      dataTransfer: blockedDataTransfer,
    });

    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Moved folder src/components to docs/components',
    );
  },
};

export const MultiFileDeleteFlow: Story = {
  render: () => <ExplorerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

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

    await fireEvent.contextMenu(canvas.getByRole('button', { name: 'App.tsx' }));
    await userEvent.click(await canvas.findByText('Delete 2 files'));

    await expect(canvas.queryByRole('button', { name: 'README.md' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'App.tsx' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Button.tsx' })).toBeVisible();
    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent('Deleted 2 files');
    await expect(canvasElement.querySelector('[data-selected="true"]')).toBeNull();
  },
};

export const FolderDeleteFlow: Story = {
  render: () => <ExplorerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await fireEvent.contextMenu(canvas.getByRole('button', { name: 'docs' }));
    await userEvent.click(await canvas.findByText('Delete'));

    await expect(canvas.queryByRole('button', { name: 'docs' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'intro.md' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'App.tsx' })).toBeVisible();
    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Deleted folder docs',
    );
  },
  tags: ['storybook-play-baseline', 'storybook-play-required'],
};

export const DropTargetHighlightFlow: Story = {
  render: () => <ExplorerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const workspaceRoot = canvas.getByRole('list', { name: 'Workspace files' });
    const docsFolder = canvas.getByRole('button', { name: 'docs' });
    const appFile = canvas.getByRole('button', { name: 'App.tsx' });

    const dataTransfer = createStoryDataTransfer();
    await fireEvent.dragStart(appFile, { dataTransfer });

    await fireEvent.dragOver(docsFolder, { dataTransfer });
    await expect(docsFolder).toHaveClass('ui-side-bar-list-item--drop-target');
    await expect(workspaceRoot).not.toHaveClass('ui-side-bar-list--drop-target');

    await fireEvent.dragLeave(docsFolder, { dataTransfer, relatedTarget: null });
    await waitFor(() => expect(docsFolder).not.toHaveClass('ui-side-bar-list-item--drop-target'));

    await fireEvent.dragOver(workspaceRoot, { dataTransfer });
    await expect(workspaceRoot).toHaveClass('ui-side-bar-list--drop-target');
    await expect(docsFolder).not.toHaveClass('ui-side-bar-list-item--drop-target');

    await fireEvent.dragLeave(workspaceRoot, { dataTransfer, relatedTarget: null });
    await waitFor(() => expect(workspaceRoot).not.toHaveClass('ui-side-bar-list--drop-target'));

    await fireEvent.dragEnd(appFile, { dataTransfer });
  },
};

export const DragMetadataFlow: Story = {
  render: () => (
    <ExplorerHarness
      dragMetadataDataType="application/x-newchobo-ui-workspace-metadata"
      dragMetadataFactory={({ sourcePaths, node, selection }) => ({
        sourcePaths,
        sourcePath: node.path,
        selectedCount: selection.paths.length,
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dataTransfer = createStoryDataTransfer();
    await fireEvent.dragStart(canvas.getByRole('button', { name: 'App.tsx' }), { dataTransfer });

    expect(dataTransfer.getData(WORKSPACE_EXPLORER_DRAG_DATA_TYPE)).toBe(
      JSON.stringify(['src/App.tsx']),
    );
    const metadata = JSON.parse(
      dataTransfer.getData('application/x-newchobo-ui-workspace-metadata'),
    ) as { sourcePath: string; sourcePaths: string[]; selectedCount: number };
    expect(metadata).toEqual({
      sourcePath: 'src/App.tsx',
      sourcePaths: ['src/App.tsx'],
      selectedCount: 1,
    });
    expect(dataTransfer.getData('text/plain')).toBe('src/App.tsx');
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

export const PathConflictDropFlow: Story = {
  render: () => <ExplorerHarness files={pathConflictFixtureFiles} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const docsFolder = canvas.getByRole('button', { name: 'docs' });
    const sourceButton = getWorkspaceItem(canvasElement, 'src/components/Button.tsx');

    const dataTransfer = createStoryDataTransfer();
    await fireEvent.dragStart(sourceButton, { dataTransfer });
    await fireEvent.dragOver(docsFolder, { dataTransfer });
    await fireEvent.drop(docsFolder, { dataTransfer });

    await expect(canvas.getByLabelText('Explorer event log')).toHaveTextContent(
      'Move blocked for src/components/Button.tsx',
    );
    await expect(getWorkspaceItem(canvasElement, 'src/components/Button.tsx')).toBeVisible();
    await expect(getWorkspaceItem(canvasElement, 'docs/Button.tsx')).toBeVisible();
    await expect(getWorkspaceItem(canvasElement, 'src/components/Button.tsx')).toHaveAttribute(
      'data-selected',
      'true',
    );
  },
};

function getWorkspaceItem(canvasElement: HTMLElement, path: string) {
  const item = canvasElement.querySelector<HTMLButtonElement>(`[data-workspace-path="${path}"]`);
  if (!item) throw new Error(`Missing workspace item for ${path}`);
  return item;
}

function isUnderWorkspacePath(path: string, parentPath: string) {
  return path === parentPath || path.startsWith(`${parentPath}/`);
}

function renameDescendantPath(path: string, sourcePath: string, destinationPath: string) {
  if (!isUnderWorkspacePath(path, sourcePath)) return path;
  return path === sourcePath
    ? destinationPath
    : `${destinationPath}/${path.slice(sourcePath.length + 1)}`;
}

function formatMoveStatus(moves: WorkspaceEntryMove[], targetFolderPath: string) {
  if (moves.length === 1) {
    const move = moves[0];
    if (move?.kind === 'folder') {
      return `Moved folder ${move.sourcePath} to ${move.destinationPath}`;
    }

    return `Moved ${move?.sourcePath} to ${move?.destinationPath}`;
  }

  const allFiles = moves.every((move) => move.kind === 'file');
  if (allFiles) {
    return `Moved ${moves.length} files to ${targetFolderPath || 'root'}`;
  }

  const allFolders = moves.every((move) => move.kind === 'folder');
  if (allFolders) {
    return `Moved ${moves.length} folders to ${targetFolderPath || 'root'}`;
  }

  return `Moved ${moves.length} entries to ${targetFolderPath || 'root'}`;
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
