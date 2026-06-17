import { fileNameOfPath, normalizeWorkspacePath, workspacePathSegments } from './path';
import type { VisibleWorkspaceNode, WorkspaceFile, WorkspaceTreeNode } from './types';

function sortWorkspaceNodes(nodes: WorkspaceTreeNode[]) {
  nodes.sort((left, right) => {
    if (left.type !== right.type) return left.type === 'folder' ? -1 : 1;
    return left.name.localeCompare(right.name);
  });

  nodes.forEach((node) => sortWorkspaceNodes(node.children));
}

export function buildWorkspaceTree(folders: string[], files: WorkspaceFile[]): WorkspaceTreeNode[] {
  const roots: WorkspaceTreeNode[] = [];
  const nodeByPath = new Map<string, WorkspaceTreeNode>();

  const ensureFolder = (folderPath: string) => {
    const normalizedPath = normalizeWorkspacePath(folderPath);
    const existingNode = nodeByPath.get(normalizedPath);
    if (existingNode) return existingNode;

    const segments = workspacePathSegments(normalizedPath);
    const node: WorkspaceTreeNode = {
      children: [],
      name: segments[segments.length - 1] ?? normalizedPath,
      path: normalizedPath,
      type: 'folder',
    };
    nodeByPath.set(normalizedPath, node);

    const parentPath = segments.slice(0, -1).join('/');
    if (parentPath) {
      ensureFolder(parentPath).children.push(node);
    } else {
      roots.push(node);
    }

    return node;
  };

  folders.forEach(ensureFolder);

  files.forEach((file) => {
    const normalizedPath = normalizeWorkspacePath(file.path);
    const segments = workspacePathSegments(normalizedPath);
    const parentPath = segments.slice(0, -1).join('/');
    const node: WorkspaceTreeNode = {
      children: [],
      file,
      name: fileNameOfPath(normalizedPath),
      path: normalizedPath,
      type: 'file',
    };

    if (parentPath) {
      ensureFolder(parentPath).children.push(node);
    } else {
      roots.push(node);
    }
  });

  sortWorkspaceNodes(roots);
  return roots;
}

function collectVisibleNodes({
  depth,
  expandedPaths,
  node,
  query,
}: {
  depth: number;
  expandedPaths: Set<string>;
  node: WorkspaceTreeNode;
  query: string;
}): { entries: VisibleWorkspaceNode[]; matches: boolean } {
  const selfMatches =
    !query ||
    node.name.toLowerCase().includes(query) ||
    node.path.toLowerCase().includes(query) ||
    Boolean(node.file?.content.toLowerCase().includes(query));
  const childBranches = node.children
    .map((child) =>
      collectVisibleNodes({
        depth: depth + 1,
        expandedPaths,
        node: child,
        query,
      }),
    )
    .filter((branch) => branch.matches);

  if (!selfMatches && childBranches.length === 0) {
    return { entries: [], matches: false };
  }

  const entries: VisibleWorkspaceNode[] = [{ depth, node }];
  if (node.type === 'folder' && (expandedPaths.has(node.path) || query)) {
    childBranches.forEach((branch) => entries.push(...branch.entries));
  }

  return { entries, matches: true };
}

export function flattenWorkspaceTree({
  expandedPaths,
  filterQuery,
  nodes,
}: {
  expandedPaths: Set<string>;
  filterQuery: string;
  nodes: WorkspaceTreeNode[];
}) {
  const query = filterQuery.trim().toLowerCase();

  return nodes.flatMap(
    (node) =>
      collectVisibleNodes({
        depth: 0,
        expandedPaths,
        node,
        query,
      }).entries,
  );
}
