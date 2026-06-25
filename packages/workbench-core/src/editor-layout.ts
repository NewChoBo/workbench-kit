import type {
  EditorGroupLayoutNode,
  EditorGroupState,
  EditorLayoutDirection,
  EditorLayoutNode,
  EditorSplitLayoutNode,
  MoveEditorOptions,
} from './editor-state.js';

export type EditorGroupDropSide = 'bottom' | 'center' | 'left' | 'right' | 'top';

const DEFAULT_EDITOR_LAYOUT_FALLBACK_GROUP_ID = 'workbench.editor.group.main' as const;

interface EditorLayoutCreationOptions {
  readonly direction?: EditorLayoutDirection | undefined;
  readonly fallbackGroupId?: string | undefined;
  readonly primarySizePercent?: number | undefined;
}

interface EditorLayoutInsertOptions {
  readonly anchorGroupId: string;
  readonly before: boolean;
  readonly direction?: EditorLayoutDirection | undefined;
  readonly groupId: string;
}

export interface EditorDropPoint {
  readonly x: number;
  readonly y: number;
}

export interface EditorDropRect {
  readonly bottom: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
}

export interface ResolveEditorGroupDropSideOptions {
  readonly point: EditorDropPoint;
  readonly rect: EditorDropRect;
}

export interface CreateEditorGroupDropMoveOptionsInput {
  readonly dropSide: EditorGroupDropSide;
  readonly groupId: string;
  readonly tabId: string;
}

export function resolveEditorGroupDropSide({
  point,
  rect,
}: ResolveEditorGroupDropSideOptions): EditorGroupDropSide {
  if (rect.width <= 0 || rect.height <= 0) {
    return 'right';
  }

  const edgeWidth = Math.min(Math.max(rect.width * 0.22, 96), rect.width / 3);
  const edgeHeight = Math.min(Math.max(rect.height * 0.22, 96), rect.height / 3);
  const candidates: Array<{ distance: number; side: EditorGroupDropSide }> = [];

  if (point.x < rect.left + edgeWidth) {
    candidates.push({ distance: Math.max(point.x - rect.left, 0), side: 'left' });
  }

  if (point.x > rect.right - edgeWidth) {
    candidates.push({ distance: Math.max(rect.right - point.x, 0), side: 'right' });
  }

  if (point.y < rect.top + edgeHeight) {
    candidates.push({ distance: Math.max(point.y - rect.top, 0), side: 'top' });
  }

  if (point.y > rect.bottom - edgeHeight) {
    candidates.push({ distance: Math.max(rect.bottom - point.y, 0), side: 'bottom' });
  }

  candidates.sort((left, right) => left.distance - right.distance);
  return candidates[0]?.side ?? 'center';
}

export function createEditorGroupDropMoveOptions({
  dropSide,
  groupId,
  tabId,
}: CreateEditorGroupDropMoveOptionsInput): MoveEditorOptions {
  if (dropSide === 'center') {
    return { groupId, tabId };
  }

  if (dropSide === 'left') {
    return { beforeGroupId: groupId, direction: 'horizontal', tabId };
  }

  if (dropSide === 'right') {
    return { afterGroupId: groupId, direction: 'horizontal', tabId };
  }

  if (dropSide === 'top') {
    return { beforeGroupId: groupId, direction: 'vertical', tabId };
  }

  return { afterGroupId: groupId, direction: 'vertical', tabId };
}

export function createEditorLayoutFromGroups(
  groups: readonly EditorGroupState[],
  options: EditorLayoutCreationOptions = {},
): EditorLayoutNode {
  const groupNodes = groups.map<EditorGroupLayoutNode>((group) =>
    createEditorGroupLayoutNode(group.id),
  );

  if (groupNodes.length <= 1) {
    return (
      groupNodes[0] ?? {
        groupId: options.fallbackGroupId ?? DEFAULT_EDITOR_LAYOUT_FALLBACK_GROUP_ID,
        type: 'group',
      }
    );
  }

  const split: EditorSplitLayoutNode = {
    children: groupNodes,
    direction: options.direction ?? 'horizontal',
    type: 'split',
  };

  return options.primarySizePercent === undefined
    ? split
    : {
        ...split,
        primarySizePercent: options.primarySizePercent,
      };
}

export function cloneEditorLayout(layout: EditorLayoutNode): EditorLayoutNode {
  if (layout.type === 'group') {
    return { ...layout };
  }

  return {
    ...layout,
    children: layout.children.map(cloneEditorLayout),
  };
}

export function createEditorLayoutForInsertedGroup(
  currentLayout: EditorLayoutNode,
  groups: readonly EditorGroupState[],
  options: EditorLayoutInsertOptions,
): EditorLayoutNode {
  const direction = options.direction ?? resolveEditorLayoutInsertionDirection(currentLayout);
  const fallbackOptions =
    currentLayout.type === 'split'
      ? {
          direction,
          primarySizePercent: currentLayout.primarySizePercent,
        }
      : { direction };
  const insertedLayout = insertEditorGroupLayout(currentLayout, {
    anchorGroupId: options.anchorGroupId,
    before: options.before,
    direction,
    groupId: options.groupId,
  });

  return insertedLayout
    ? normalizeEditorLayoutWithGroups(insertedLayout, groups, fallbackOptions)
    : createEditorLayoutFromGroups(groups, fallbackOptions);
}

export function reconcileEditorLayoutWithGroups(
  layout: EditorLayoutNode,
  groups: readonly EditorGroupState[],
  previousGroups: readonly EditorGroupState[],
): EditorLayoutNode {
  if (hasSameEditorGroupIds(groups, previousGroups)) {
    return cloneEditorLayout(layout);
  }

  return normalizeEditorLayoutWithGroups(
    layout,
    groups,
    layout.type === 'split'
      ? {
          direction: layout.direction,
          primarySizePercent: layout.primarySizePercent,
        }
      : undefined,
  );
}

export function normalizeEditorLayoutWithGroups(
  layout: EditorLayoutNode,
  groups: readonly EditorGroupState[],
  options: EditorLayoutCreationOptions = {},
): EditorLayoutNode {
  const groupIds = new Set(groups.map((group) => group.id));
  const seenGroupIds = new Set<string>();
  const prunedLayout = pruneEditorLayout(layout, groupIds, seenGroupIds);
  if (!prunedLayout) {
    return createEditorLayoutFromGroups(groups, options);
  }

  const missingGroups = groups.filter((group) => !seenGroupIds.has(group.id));
  if (missingGroups.length === 0) {
    return prunedLayout;
  }

  const missingNodes = missingGroups.map((group) => createEditorGroupLayoutNode(group.id));
  if (prunedLayout.type === 'split' && prunedLayout.direction === options.direction) {
    return {
      ...prunedLayout,
      children: [...prunedLayout.children, ...missingNodes],
    };
  }

  return {
    children: [prunedLayout, ...missingNodes],
    direction: options.direction ?? resolveEditorLayoutInsertionDirection(prunedLayout),
    ...(options.primarySizePercent === undefined
      ? {}
      : { primarySizePercent: options.primarySizePercent }),
    type: 'split',
  };
}

export function updateEditorSplitLayout(
  layout: EditorLayoutNode,
  path: readonly number[],
  updater: (layout: EditorSplitLayoutNode) => EditorSplitLayoutNode,
): EditorLayoutNode | undefined {
  if (path.length === 0) {
    return layout.type === 'split' ? updater(layout) : undefined;
  }

  if (layout.type !== 'split') {
    return undefined;
  }

  const [childIndex, ...restPath] = path;
  if (childIndex === undefined || childIndex < 0 || childIndex >= layout.children.length) {
    return undefined;
  }

  const child = layout.children[childIndex];
  const nextChild = child ? updateEditorSplitLayout(child, restPath, updater) : undefined;
  if (!nextChild) {
    return undefined;
  }

  return {
    ...layout,
    children: layout.children.map((entry, index) => (index === childIndex ? nextChild : entry)),
  };
}

export function normalizeEditorSplitPrimarySizePercent(primarySizePercent: number): number {
  if (!Number.isFinite(primarySizePercent)) {
    return 50;
  }

  return Math.min(Math.max(primarySizePercent, 5), 95);
}

export function isSameEditorLayout(left: EditorLayoutNode, right: EditorLayoutNode): boolean {
  if (left.type !== right.type) {
    return false;
  }

  if (left.type === 'group' && right.type === 'group') {
    return left.groupId === right.groupId;
  }

  if (left.type === 'split' && right.type === 'split') {
    return (
      left.direction === right.direction &&
      left.primarySizePercent === right.primarySizePercent &&
      left.children.length === right.children.length &&
      left.children.every((child, index) => {
        const otherChild = right.children[index];
        return otherChild ? isSameEditorLayout(child, otherChild) : false;
      })
    );
  }

  return false;
}

function createEditorGroupLayoutNode(groupId: string): EditorGroupLayoutNode {
  return {
    groupId,
    type: 'group',
  };
}

function resolveEditorLayoutInsertionDirection(layout: EditorLayoutNode): EditorLayoutDirection {
  return layout.type === 'split' ? layout.direction : 'horizontal';
}

function insertEditorGroupLayout(
  layout: EditorLayoutNode,
  options: {
    readonly anchorGroupId: string;
    readonly before: boolean;
    readonly direction: EditorLayoutDirection;
    readonly groupId: string;
  },
): EditorLayoutNode | undefined {
  if (layout.type === 'group') {
    if (layout.groupId !== options.anchorGroupId) {
      return undefined;
    }

    return createEditorSplitLayoutFromAnchor({
      anchor: layout,
      before: options.before,
      direction: options.direction,
      groupId: options.groupId,
    });
  }

  const directAnchorIndex = layout.children.findIndex(
    (child) => child.type === 'group' && child.groupId === options.anchorGroupId,
  );
  if (directAnchorIndex >= 0) {
    const anchor = layout.children[directAnchorIndex];
    if (!anchor || anchor.type !== 'group') {
      return undefined;
    }

    if (layout.direction === options.direction) {
      const nextChildren = [...layout.children];
      nextChildren.splice(
        options.before ? directAnchorIndex : directAnchorIndex + 1,
        0,
        createEditorGroupLayoutNode(options.groupId),
      );
      return {
        ...layout,
        children: nextChildren,
      };
    }

    return {
      ...layout,
      children: layout.children.map((child, index) =>
        index === directAnchorIndex
          ? createEditorSplitLayoutFromAnchor({
              anchor,
              before: options.before,
              direction: options.direction,
              groupId: options.groupId,
            })
          : child,
      ),
    };
  }

  for (let index = 0; index < layout.children.length; index += 1) {
    const child = layout.children[index];
    if (!child) {
      continue;
    }

    const nextChild = insertEditorGroupLayout(child, options);
    if (!nextChild) {
      continue;
    }

    return {
      ...layout,
      children: layout.children.map((entry, childIndex) =>
        childIndex === index ? nextChild : entry,
      ),
    };
  }

  return undefined;
}

function createEditorSplitLayoutFromAnchor({
  anchor,
  before,
  direction,
  groupId,
}: {
  readonly anchor: EditorGroupLayoutNode;
  readonly before: boolean;
  readonly direction: EditorLayoutDirection;
  readonly groupId: string;
}): EditorSplitLayoutNode {
  const inserted = createEditorGroupLayoutNode(groupId);
  return {
    children: before ? [inserted, anchor] : [anchor, inserted],
    direction,
    type: 'split',
  };
}

function pruneEditorLayout(
  layout: EditorLayoutNode,
  groupIds: ReadonlySet<string>,
  seenGroupIds: Set<string>,
): EditorLayoutNode | undefined {
  if (layout.type === 'group') {
    if (!groupIds.has(layout.groupId) || seenGroupIds.has(layout.groupId)) {
      return undefined;
    }

    seenGroupIds.add(layout.groupId);
    return { ...layout };
  }

  const children = layout.children
    .map((child) => pruneEditorLayout(child, groupIds, seenGroupIds))
    .filter((child): child is EditorLayoutNode => child !== undefined);

  if (children.length === 0) {
    return undefined;
  }

  if (children.length === 1) {
    return children[0];
  }

  return {
    ...layout,
    children,
  };
}

function hasSameEditorGroupIds(
  left: readonly EditorGroupState[],
  right: readonly EditorGroupState[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightIds = new Set(right.map((group) => group.id));
  return left.every((group) => rightIds.has(group.id));
}
