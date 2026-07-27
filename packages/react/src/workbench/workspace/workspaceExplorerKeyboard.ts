import { parentPathOf } from '@workbench-kit/workspace';

import type { WorkspaceTreeNode } from './types.js';

export type WorkspaceExplorerVisibleRow = {
  readonly depth: number;
  readonly node: WorkspaceTreeNode;
};

export type WorkspaceExplorerVerticalNavigationKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

export type WorkspaceExplorerHorizontalNavigationKey = 'ArrowLeft' | 'ArrowRight';

export type WorkspaceExplorerHorizontalNavigationAction =
  | { readonly type: 'toggle'; readonly path: string }
  | { readonly type: 'focus'; readonly path: string };

function rowIndexByPath(
  rows: readonly WorkspaceExplorerVisibleRow[],
  path: string | undefined,
): number {
  if (!path) {
    return -1;
  }
  return rows.findIndex((row) => row.node.path === path);
}

/**
 * Resolve the next focused path for vertical tree navigation over visible
 * (already collapse-filtered) explorer rows.
 */
export function resolveWorkspaceExplorerNavigationPath(
  rows: readonly WorkspaceExplorerVisibleRow[],
  focusedPath: string | undefined,
  key: WorkspaceExplorerVerticalNavigationKey,
): string | null {
  if (rows.length === 0) {
    return null;
  }

  const currentIndex = rowIndexByPath(rows, focusedPath);
  const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;

  if (key === 'Home') {
    return rows[0]?.node.path ?? null;
  }
  if (key === 'End') {
    return rows[rows.length - 1]?.node.path ?? null;
  }
  if (key === 'ArrowDown') {
    return rows[Math.min(rows.length - 1, fallbackIndex + 1)]?.node.path ?? null;
  }
  return rows[Math.max(0, fallbackIndex - 1)]?.node.path ?? null;
}

function firstChildPath(
  rows: readonly WorkspaceExplorerVisibleRow[],
  parentPath: string,
): string | null {
  return rows.find((row) => parentPathOf(row.node.path) === parentPath)?.node.path ?? null;
}

/**
 * Resolve expand/collapse/parent focus for ArrowLeft/ArrowRight.
 * Call `onToggleFolder` only for `toggle` actions (toggle-only host API).
 */
export function resolveWorkspaceExplorerHorizontalNavigationAction(
  rows: readonly WorkspaceExplorerVisibleRow[],
  focusedPath: string | undefined,
  expandedPaths: ReadonlySet<string>,
  key: WorkspaceExplorerHorizontalNavigationKey,
  options: { readonly filterActive?: boolean } = {},
): WorkspaceExplorerHorizontalNavigationAction | null {
  const currentIndex = rowIndexByPath(rows, focusedPath);
  const current = rows[currentIndex >= 0 ? currentIndex : 0];
  if (!current) {
    return null;
  }

  const { node } = current;
  const filterActive = options.filterActive ?? false;
  const isFolder = node.type === 'folder';
  const expanded = isFolder && (expandedPaths.has(node.path) || filterActive);

  if (key === 'ArrowRight') {
    if (!isFolder) {
      return null;
    }
    if (!expanded && !filterActive) {
      return { type: 'toggle', path: node.path };
    }
    const childPath = firstChildPath(rows, node.path);
    return childPath ? { type: 'focus', path: childPath } : null;
  }

  // ArrowLeft
  if (isFolder && expanded && !filterActive) {
    return { type: 'toggle', path: node.path };
  }

  const parentPath = parentPathOf(node.path);
  if (!parentPath) {
    return null;
  }
  if (rowIndexByPath(rows, parentPath) < 0) {
    return null;
  }
  return { type: 'focus', path: parentPath };
}
