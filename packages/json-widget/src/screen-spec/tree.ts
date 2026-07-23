import type { WidgetPath } from '../document/path.js';
import { appendChildrenPath, ROOT_WIDGET_PATH } from '../document/path.js';
import {
  screenColumn,
  screenGrid,
  screenPanel,
  screenRow,
  screenStack,
  screenText,
} from './builders.js';
import type {
  JdwScreenSpec,
  ScreenColumnNode,
  ScreenGridNode,
  ScreenNode,
  ScreenRowNode,
  ScreenStackNode,
} from './types.js';

type ScreenContainerNode = ScreenRowNode | ScreenColumnNode | ScreenGridNode | ScreenStackNode;

/** Built-in Screen Spec palette kinds (scaffold blocks — not Library tile assets). */
export type ScreenPaletteKind = 'text' | 'panel' | 'row' | 'column' | 'grid' | 'stack';

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
  /** Present when this outline row is the child of an expanded wrapper. */
  readonly flex?: number | undefined;
}

export function isScreenContainerNode(node: ScreenNode): node is ScreenContainerNode {
  return (
    node.kind === 'row' || node.kind === 'column' || node.kind === 'grid' || node.kind === 'stack'
  );
}

function getScreenNodeChildren(node: ScreenNode): readonly ScreenNode[] {
  if (node.kind === 'expanded') {
    return [node.child];
  }
  if (isScreenContainerNode(node)) {
    return node.children;
  }
  return [];
}

function describeScreenNode(node: ScreenNode, flex?: number): string {
  const flexSuffix = flex !== undefined ? ` · flex ${flex}` : '';
  switch (node.kind) {
    case 'text': {
      const preview = node.content.trim().length > 0 ? node.content : '(empty)';
      return `text: ${preview.length > 28 ? `${preview.slice(0, 28)}…` : preview}${flexSuffix}`;
    }
    case 'panel':
      return `panel: ${node.content || '(empty)'}${flexSuffix}`;
    case 'expanded':
      return `expanded${node.flex !== undefined ? ` (flex ${node.flex})` : ''}`;
    case 'row':
    case 'column':
    case 'grid':
    case 'stack':
      return `${node.kind} (${getScreenNodeChildren(node).length} children)${flexSuffix}`;
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

    if (!isScreenContainerNode(node)) {
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

export function createDefaultScreenNode(kind: ScreenPaletteKind): ScreenNode {
  switch (kind) {
    case 'text':
      return screenText('Text');
    case 'panel':
      return screenPanel('Panel');
    case 'row':
      return screenRow([screenText('Item')]);
    case 'column':
      return screenColumn([screenText('Item')]);
    case 'grid':
      return screenGrid(2, [screenText('A'), screenText('B')]);
    case 'stack':
      return screenStack([screenPanel('Layer')]);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * Walks from the selection up to the nearest container that can accept children.
 */
export function resolveScreenInsertParentPath(
  root: ScreenNode,
  selectedPath: ScreenNodePath,
): ScreenNodePath | null {
  for (let length = selectedPath.length; length >= 0; length -= 1) {
    const path = selectedPath.slice(0, length);
    const node = getScreenNodeAt(root, path);
    if (node && isScreenContainerNode(node)) {
      return path;
    }
  }
  return null;
}

export interface InsertScreenNodeResult {
  readonly spec: JdwScreenSpec;
  readonly insertedPath: ScreenNodePath;
  readonly parentPath: ScreenNodePath;
}

export function insertScreenNodeAt(
  spec: JdwScreenSpec,
  parentPath: ScreenNodePath,
  child: ScreenNode,
  index?: number,
): InsertScreenNodeResult | null {
  const parent = getScreenNodeAt(spec.root, parentPath);
  if (!parent || !isScreenContainerNode(parent)) {
    return null;
  }

  const insertAt =
    index === undefined
      ? parent.children.length
      : Math.max(0, Math.min(index, parent.children.length));
  const children = [...parent.children];
  children.splice(insertAt, 0, child);
  const nextSpec = updateScreenNodeAt(spec, parentPath, withUpdatedChildren(parent, children));

  return {
    spec: nextSpec,
    insertedPath: [...parentPath, insertAt],
    parentPath,
  };
}

export interface RemoveScreenNodeResult {
  readonly spec: JdwScreenSpec;
  readonly nextSelectedPath: ScreenNodePath;
}

/**
 * Removes a non-root node. Removing the sole child of an `expanded` wrapper
 * removes the wrapper from its parent instead.
 */
export function removeScreenNodeAt(
  spec: JdwScreenSpec,
  path: ScreenNodePath,
): RemoveScreenNodeResult | null {
  if (path.length === 0) {
    return null;
  }

  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  if (index === undefined) {
    return null;
  }

  const parent = getScreenNodeAt(spec.root, parentPath);
  if (!parent) {
    return null;
  }

  if (parent.kind === 'expanded') {
    return removeScreenNodeAt(spec, parentPath);
  }

  if (!isScreenContainerNode(parent)) {
    return null;
  }

  if (index < 0 || index >= parent.children.length) {
    return null;
  }

  const children = parent.children.filter((_, childIndex) => childIndex !== index);
  const nextSpec = updateScreenNodeAt(spec, parentPath, withUpdatedChildren(parent, children));
  const nextSelectedPath: ScreenNodePath =
    children.length === 0 ? parentPath : [...parentPath, Math.min(index, children.length - 1)];

  return {
    spec: nextSpec,
    nextSelectedPath,
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

/**
 * Maps a Screen Spec outline path to the compiled JDW widget path.
 * `expanded` wrappers unwrap in compile, so they do not add a widget segment.
 */
export function screenNodePathToWidgetPath(
  root: ScreenNode,
  path: ScreenNodePath,
): WidgetPath | null {
  let node: ScreenNode = root;
  let widgetPath: WidgetPath = ROOT_WIDGET_PATH;

  for (const index of path) {
    if (node.kind === 'expanded') {
      if (index !== 0) {
        return null;
      }
      node = node.child;
      continue;
    }

    if (!isScreenContainerNode(node)) {
      return null;
    }

    const child = node.children[index];
    if (!child) {
      return null;
    }

    widgetPath = appendChildrenPath(widgetPath, index);
    node = child;
  }

  return widgetPath;
}

/**
 * Maps a compiled JDW widget path back to a Screen Spec node path.
 */
export function widgetPathToScreenNodePath(
  root: ScreenNode,
  widgetPath: WidgetPath,
): ScreenNodePath | null {
  let node: ScreenNode = root;
  const screenPath: number[] = [];

  for (const segment of widgetPath) {
    if (segment.kind !== 'children') {
      return null;
    }

    if (node.kind === 'expanded') {
      node = node.child;
    }

    if (!isScreenContainerNode(node)) {
      return null;
    }

    const child = node.children[segment.index];
    if (!child) {
      return null;
    }

    screenPath.push(segment.index);
    if (child.kind === 'expanded') {
      screenPath.push(0);
      node = child.child;
    } else {
      node = child;
    }
  }

  return screenPath;
}

export function listScreenSpecOutline(spec: JdwScreenSpec): readonly ScreenSpecOutlineEntry[] {
  const entries: ScreenSpecOutlineEntry[] = [];

  const walk = (node: ScreenNode, path: ScreenNodePath, depth: number, flex?: number) => {
    // Collapse expanded wrappers: show the child row with an optional flex badge.
    if (node.kind === 'expanded') {
      walk(node.child, [...path, 0], depth, node.flex);
      return;
    }

    entries.push({
      path,
      depth,
      label: describeScreenNode(node, flex),
      node,
      parentKind: getParentKind(spec.root, path),
      ...(flex !== undefined ? { flex } : {}),
    });

    if (!isScreenContainerNode(node)) {
      return;
    }

    for (const [index, child] of node.children.entries()) {
      walk(child, [...path, index], depth + 1);
    }
  };

  walk(spec.root, [], 0);
  return entries;
}

export function formatScreenSpecJson(spec: JdwScreenSpec): string {
  return `${JSON.stringify(spec, null, 2)}\n`;
}
