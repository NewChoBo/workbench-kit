import { describe, expect, it } from 'vitest';
import {
  WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID,
  WORKBENCH_WORKSPACE_DELETE_COMMAND_ID,
  WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID,
  WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID,
  WORKBENCH_WORKSPACE_OPEN_COMMAND_ID,
  WORKBENCH_WORKSPACE_RENAME_COMMAND_ID,
} from '@workbench-kit/react/workbench/commands';
import type { ContextMenuItem } from '@workbench-kit/react/overlay';
import type { WorkspaceTreeNode } from '@workbench-kit/workspace';

import { createExplorerItemContextMenuItems } from './explorer-context-menu.js';

describe('createExplorerItemContextMenuItems', () => {
  it('creates folder menu items and routes folder actions', () => {
    const calls: string[] = [];
    const items = createExplorerItemContextMenuItems({
      actionPaths: ['src'],
      copyPaths: (paths) => calls.push(`copy:${paths.join(',')}`),
      createFile: (parentPath) => calls.push(`newFile:${parentPath}`),
      createFolder: (parentPath) => calls.push(`newFolder:${parentPath}`),
      deleteTargets: (paths) => calls.push(`delete:${paths.join(',')}`),
      files: [{ path: 'src/App.tsx' }],
      node: folderNode('src'),
      openFiles: (paths) => calls.push(`open:${paths.join(',')}`),
      revealFolder: (path) => calls.push(`reveal:${path}`),
      renameTarget: () => calls.push('rename'),
    });

    expect(itemIds(items)).toEqual([
      WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID,
      WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID,
      'workspace-create-separator',
      WORKBENCH_WORKSPACE_OPEN_COMMAND_ID,
      WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID,
      'workspace-separator',
      WORKBENCH_WORKSPACE_RENAME_COMMAND_ID,
      WORKBENCH_WORKSPACE_DELETE_COMMAND_ID,
    ]);

    selectItem(items, WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID);
    selectItem(items, WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID);
    selectItem(items, WORKBENCH_WORKSPACE_OPEN_COMMAND_ID);
    selectItem(items, WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID);
    selectItem(items, WORKBENCH_WORKSPACE_RENAME_COMMAND_ID);
    selectItem(items, WORKBENCH_WORKSPACE_DELETE_COMMAND_ID);

    expect(calls).toEqual([
      'newFile:src',
      'newFolder:src',
      'reveal:src',
      'copy:src',
      'rename',
      'delete:src',
    ]);
  });

  it('creates multi-file menu items and hides rename', () => {
    const calls: string[] = [];
    const items = createExplorerItemContextMenuItems({
      actionPaths: ['src/App.tsx', 'README.md'],
      copyPaths: (paths) => calls.push(`copy:${paths.join(',')}`),
      createFile: (parentPath) => calls.push(`newFile:${parentPath}`),
      createFolder: (parentPath) => calls.push(`newFolder:${parentPath}`),
      deleteTargets: (paths) => calls.push(`delete:${paths.join(',')}`),
      files: [{ path: 'src/App.tsx' }, { path: 'README.md' }],
      node: fileNode('src/App.tsx'),
      openFiles: (paths) => calls.push(`open:${paths.join(',')}`),
      revealFolder: (path) => calls.push(`reveal:${path}`),
      renameTarget: () => calls.push('rename'),
    });

    expect(itemIds(items)).toEqual([
      WORKBENCH_WORKSPACE_OPEN_COMMAND_ID,
      WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID,
      'workspace-separator',
      WORKBENCH_WORKSPACE_DELETE_COMMAND_ID,
    ]);

    selectItem(items, WORKBENCH_WORKSPACE_OPEN_COMMAND_ID);
    selectItem(items, WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID);
    selectItem(items, WORKBENCH_WORKSPACE_DELETE_COMMAND_ID);

    expect(calls).toEqual([
      'open:src/App.tsx,README.md',
      'copy:src/App.tsx,README.md',
      'delete:src/App.tsx,README.md',
    ]);
  });
});

function itemIds(items: ContextMenuItem[]): (string | undefined)[] {
  return items.map((item) => item.id);
}

function selectItem(items: ContextMenuItem[], id: string): void {
  const item = items.find((candidate) => candidate.id === id);
  if (!item || item.type === 'separator') {
    throw new Error(`Menu item not found: ${id}`);
  }

  item.onSelect();
}

function folderNode(path: string): WorkspaceTreeNode {
  return {
    children: [],
    name: basename(path),
    path,
    type: 'folder',
  };
}

function fileNode(path: string): WorkspaceTreeNode {
  return {
    children: [],
    file: {
      content: '',
      path,
    },
    name: basename(path),
    path,
    type: 'file',
  };
}

function basename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}
