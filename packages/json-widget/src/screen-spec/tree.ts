import type {
  JdwScreenSpec,
  ScreenColumnNode,
  ScreenGridNode,
  ScreenNode,
  ScreenRowNode,
  ScreenStackNode,
} from './types.js';

type ScreenContainerNode = ScreenRowNode | ScreenColumnNode | ScreenGridNode | ScreenStackNode;

function withUpdatedChildren(
  node: ScreenContainerNode,
  children: readonly ScreenNode[],
): ScreenContainerNode {
  return { ...node, children };
}

export type ScreenNodePath = readonly number[];

export interface ScreenSpecOutlineEntry {
  readonly path: ScreenNodePath;
  readonly depth: number;
  readonly label: string;
  readonly node: ScreenNode;
  readonly parentKind?: ScreenNode['kind'] | undefined;
}

function isContainerNode(node: ScreenNode): node is ScreenContainerNode {
  return (
    node.kind === 'row' || node.kind === 'column' || node.kind === 'grid' || node.kind === 'stack'
  );
}

function getScreenNodeChildren(node: ScreenNode): readonly ScreenNode[] {
  if (node.kind === 'expanded') {
    return [node.child];
  }
  if (isContainerNode(node)) {
    return node.children;
  }
  return [];
}

function describeScreenNode(node: ScreenNode): string {
  switch (node.kind) {
    case 'text': {
      const preview = node.content.trim().length > 0 ? node.content : '(empty)';
      return `text: ${preview.length > 28 ? `${preview.slice(0, 28)}…` : preview}`;
    }
    case 'panel':
      return `panel: ${node.content || '(empty)'}`;
    case 'expanded':
      return `expanded${node.flex !== undefined ? ` (flex ${node.flex})` : ''}`;
    case 'row':
    case 'column':
    case 'grid':
    case 'stack':
      return `${node.kind} (${getScreenNodeChildren(node).length} children)`;
    default:
      return 'node';
  }
}

function getParentKind(root: ScreenNode, path: ScreenNodePath): ScreenNode['kind'] | undefined {
  if (path.length === 0) {
    return undefined;
  }

  const parentPath = path.slice(0, -1);
  const parent = getScreenNodeAt(root, parentPath);
  return parent?.kind;
}

export function getScreenNodeAt(root: ScreenNode, path: ScreenNodePath): ScreenNode | null {
  let current: ScreenNode = root;

  for (const index of path) {
    const children = getScreenNodeChildren(current);
    const next = children[index];
    if (!next) {
      return null;
    }
    current = next;
  }

  return current;
}

export function updateScreenNodeAt(
  spec: JdwScreenSpec,
  path: ScreenNodePath,
  nextNode: ScreenNode,
): JdwScreenSpec {
  if (path.length === 0) {
    return { ...spec, root: nextNode };
  }

  const updateAt = (node: ScreenNode, remaining: ScreenNodePath): ScreenNode => {
    const [index, ...rest] = remaining;
    if (index === undefined) {
      return nextNode;
    }

    if (node.kind === 'expanded') {
      return {
        ...node,
        child: rest.length === 0 ? nextNode : updateAt(node.child, rest),
      };
    }

    if (!isContainerNode(node)) {
      return node;
    }

    const children = [...node.children];
    const currentChild = children[index];
    if (!currentChild) {
      return node;
    }

    children[index] = rest.length === 0 ? nextNode : updateAt(currentChild, rest);
    return withUpdatedChildren(node, children);
  };

  return {
    ...spec,
    root: updateAt(spec.root, path),
  };
}

export function updateScreenSpecMetadata(
  spec: JdwScreenSpec,
  patch: Partial<Pick<JdwScreenSpec, 'title' | 'description' | 'frameWidth' | 'layout'>>,
): JdwScreenSpec {
  return {
    ...spec,
    ...patch,
    layout: patch.layout ? { ...spec.layout, ...patch.layout } : spec.layout,
  };
}

export function listScreenSpecOutline(spec: JdwScreenSpec): readonly ScreenSpecOutlineEntry[] {
  const entries: ScreenSpecOutlineEntry[] = [];

  const walk = (node: ScreenNode, path: ScreenNodePath, depth: number) => {
    entries.push({
      path,
      depth,
      label: describeScreenNode(node),
      node,
      parentKind: getParentKind(spec.root, path),
    });

    for (const [index, child] of getScreenNodeChildren(node).entries()) {
      walk(child, [...path, index], depth + 1);
    }
  };

  walk(spec.root, [], 0);
  return entries;
}
