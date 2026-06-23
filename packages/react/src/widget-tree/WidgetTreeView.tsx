import { useEffect, useMemo, useState, type DragEvent, type KeyboardEvent } from 'react';
import type { WidgetPlacementAsset } from '@workbench-kit/contracts';
import {
  collectWidgetNodes,
  firstSelectedWidgetPath,
  getWidgetDisplayLabel,
  getWidgetChildren,
  isWidgetPathSelected,
  widgetPathEquals,
  widgetPathKey,
  type GenericWidget,
  type WidgetNode,
  type WidgetPath,
  type WidgetSelectionState,
} from '@workbench-kit/jdw';

import { Panel, PanelBody } from '../layout/Panel';
import { EmptyState } from '../primitives/EmptyState';
import { cx } from '../utils/cx';
import { readWidgetPlacementAssetDragData } from './widget-placement-asset-dnd.js';
import {
  canAddChildren,
  formatWidgetPlacementMeta,
  insertedWidgetPathForParent,
} from './widget-tree-layout.js';

export interface WidgetTreeViewProps {
  readonly root: GenericWidget | null;
  readonly parseError: string | null;
  readonly selection?: WidgetSelectionState | undefined;
  readonly onSelectPath?: ((path: WidgetPath) => void) | undefined;
  readonly onDeletePath?: ((path: WidgetPath) => void) | undefined;
  readonly onMovePath?: ((operation: WidgetTreeMoveOperation) => void) | undefined;
  readonly onPlaceAssetPath?: ((operation: WidgetTreeAssetDropOperation) => void) | undefined;
}

type WidgetTreeNavigationKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';
type WidgetTreeMoveDirection = 'up' | 'down';
export type WidgetTreeDropPlacement = 'before' | 'inside' | 'after';

export interface WidgetTreeReorderOperation {
  readonly kind: 'reorder';
  readonly path: WidgetPath;
  readonly parentPath: WidgetPath;
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly nextPath: WidgetPath;
}

export interface WidgetTreeReparentOperation {
  readonly kind: 'reparent';
  readonly fromPath: WidgetPath;
  readonly toParentPath: WidgetPath;
  readonly insertIndex: number;
  readonly nextPath: WidgetPath;
}

export type WidgetTreeMoveOperation = WidgetTreeReorderOperation | WidgetTreeReparentOperation;

export interface WidgetTreeAssetDropOperation {
  readonly asset: WidgetPlacementAsset;
  readonly parentPath: WidgetPath;
  readonly insertIndex: number;
  readonly nextPath: WidgetPath;
}

interface WidgetTreeDropTarget {
  readonly pathKey: string;
  readonly placement: WidgetTreeDropPlacement;
}

function selectedNodeIndex(
  nodes: readonly WidgetNode[],
  selection: WidgetSelectionState | undefined,
): number {
  if (!selection) return -1;
  return nodes.findIndex((node) => isWidgetPathSelected(selection, node.path));
}

export function resolveWidgetTreeNavigationPath(
  nodes: readonly WidgetNode[],
  selection: WidgetSelectionState | undefined,
  key: WidgetTreeNavigationKey,
): WidgetPath | null {
  if (nodes.length === 0) return null;

  const currentIndex = selectedNodeIndex(nodes, selection);
  const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;

  if (key === 'Home') return nodes[0]?.path ?? null;
  if (key === 'End') return nodes[nodes.length - 1]?.path ?? null;
  if (key === 'ArrowDown')
    return nodes[Math.min(nodes.length - 1, fallbackIndex + 1)]?.path ?? null;
  return nodes[Math.max(0, fallbackIndex - 1)]?.path ?? null;
}

export function isRootWidgetPath(path: WidgetPath): boolean {
  return path.length === 0;
}

function arrayChildSegment(
  path: WidgetPath,
): { readonly kind: 'children'; readonly index: number } | null {
  const segment = path[path.length - 1];
  return segment?.kind === 'children' ? segment : null;
}

function pathAtIndex(parentPath: WidgetPath, index: number): WidgetPath {
  return [...parentPath, { kind: 'children', index }];
}

function hasNodeAtPath(nodes: readonly WidgetNode[], path: WidgetPath): boolean {
  const key = widgetPathKey(path);
  return nodes.some((node) => widgetPathKey(node.path) === key);
}

function nodeAtPath(nodes: readonly WidgetNode[], path: WidgetPath): WidgetNode | null {
  const key = widgetPathKey(path);
  return nodes.find((node) => widgetPathKey(node.path) === key) ?? null;
}

function isPathPrefix(prefix: WidgetPath, path: WidgetPath): boolean {
  if (prefix.length > path.length) return false;
  return prefix.every((segment, index) => {
    const candidate = path[index];
    if (!candidate || segment.kind !== candidate.kind) return false;
    return (
      segment.kind === 'child' ||
      (candidate.kind === 'children' && segment.index === candidate.index)
    );
  });
}

function isGenericWidget(value: unknown): value is GenericWidget {
  return (
    value !== null &&
    !Array.isArray(value) &&
    typeof value === 'object' &&
    typeof (value as GenericWidget).type === 'string'
  );
}

export function hasCollapsibleWidgetChildren(widget: GenericWidget): boolean {
  return getWidgetChildren(widget).length > 0 || isGenericWidget(widget.child);
}

function hasCollapsedAncestor(path: WidgetPath, collapsedPathKeys: ReadonlySet<string>): boolean {
  for (let depth = 0; depth < path.length; depth++) {
    if (collapsedPathKeys.has(widgetPathKey(path.slice(0, depth)))) {
      return true;
    }
  }

  return false;
}

export function filterVisibleWidgetNodes(
  nodes: readonly WidgetNode[],
  collapsedPathKeys: ReadonlySet<string>,
): WidgetNode[] {
  if (collapsedPathKeys.size === 0) return [...nodes];
  return nodes.filter((node) => !hasCollapsedAncestor(node.path, collapsedPathKeys));
}

function adjustPathAfterRemoval(path: WidgetPath, removedPath: WidgetPath): WidgetPath {
  const removedSegment = removedPath[removedPath.length - 1];
  if (removedSegment?.kind !== 'children') return path;

  const removedParentPath = removedPath.slice(0, -1);
  return path.map((segment, depth) => {
    if (segment.kind !== 'children' || depth !== removedParentPath.length) return segment;

    const sameParent = removedParentPath.every((ancestorSegment, index) => {
      const candidate = path[index];
      if (!candidate || ancestorSegment.kind !== candidate.kind) return false;
      return (
        ancestorSegment.kind === 'child' ||
        (candidate.kind === 'children' && ancestorSegment.index === candidate.index)
      );
    });

    if (sameParent && removedSegment.index < segment.index) {
      return { kind: 'children', index: segment.index - 1 } as const;
    }

    return segment;
  });
}

function createMoveOperation(
  nodes: readonly WidgetNode[],
  path: WidgetPath,
  toIndex: number,
): WidgetTreeReorderOperation | null {
  const segment = arrayChildSegment(path);
  if (!segment || toIndex < 0 || segment.index === toIndex) return null;

  const parentPath = path.slice(0, -1);
  const nextPath = pathAtIndex(parentPath, toIndex);
  if (!hasNodeAtPath(nodes, nextPath)) return null;

  return {
    kind: 'reorder',
    path,
    parentPath,
    fromIndex: segment.index,
    toIndex,
    nextPath,
  };
}

export function resolveWidgetTreeMoveOperation(
  nodes: readonly WidgetNode[],
  selection: WidgetSelectionState | undefined,
  direction: WidgetTreeMoveDirection,
): WidgetTreeMoveOperation | null {
  const current = nodes[selectedNodeIndex(nodes, selection)];
  if (!current) return null;

  const segment = arrayChildSegment(current.path);
  if (!segment) return null;

  const toIndex = direction === 'up' ? segment.index - 1 : segment.index + 1;
  return createMoveOperation(nodes, current.path, toIndex);
}

function createReparentOperation(
  nodes: readonly WidgetNode[],
  sourcePath: WidgetPath,
  targetParentPath: WidgetPath,
  insertIndex: number,
): WidgetTreeReparentOperation | null {
  if (isRootWidgetPath(sourcePath)) return null;
  if (isPathPrefix(sourcePath, targetParentPath)) return null;

  const targetNode = nodeAtPath(nodes, targetParentPath);
  if (!targetNode || !canAddChildren(targetNode.widget)) return null;

  const sourceSegment = arrayChildSegment(sourcePath);
  const targetChildren = getWidgetChildren(targetNode.widget);
  if (insertIndex < 0 || insertIndex > targetChildren.length) return null;

  const sameParent =
    sourceSegment !== null && widgetPathEquals(sourcePath.slice(0, -1), targetParentPath);
  const targetIndex =
    sameParent && sourceSegment.index < insertIndex ? insertIndex - 1 : insertIndex;
  if (sameParent && sourceSegment?.index === targetIndex) return null;

  const adjustedParentPath = adjustPathAfterRemoval(targetParentPath, sourcePath);
  const nextPath = insertedWidgetPathForParent(targetNode.widget, adjustedParentPath, targetIndex);

  return {
    kind: 'reparent',
    fromPath: sourcePath,
    toParentPath: targetParentPath,
    insertIndex,
    nextPath,
  };
}

export function resolveWidgetTreeDropOperation(
  nodes: readonly WidgetNode[],
  sourcePath: WidgetPath,
  targetPath: WidgetPath,
  placement: WidgetTreeDropPlacement = 'inside',
): WidgetTreeMoveOperation | null {
  const targetNode = nodeAtPath(nodes, targetPath);
  if (!targetNode) return null;

  if (placement === 'inside') {
    if (!canAddChildren(targetNode.widget)) return null;

    return createReparentOperation(
      nodes,
      sourcePath,
      targetPath,
      getWidgetChildren(targetNode.widget).length,
    );
  }

  const target = arrayChildSegment(targetPath);
  if (!target) return null;

  return createReparentOperation(
    nodes,
    sourcePath,
    targetPath.slice(0, -1),
    target.index + (placement === 'after' ? 1 : 0),
  );
}

export function resolveWidgetTreeAssetDropOperation(
  nodes: readonly WidgetNode[],
  asset: WidgetPlacementAsset,
  targetPath: WidgetPath,
  placement: WidgetTreeDropPlacement = 'inside',
): WidgetTreeAssetDropOperation | null {
  const targetNode = nodeAtPath(nodes, targetPath);
  if (!targetNode) return null;

  if (placement === 'inside') {
    if (!canAddChildren(targetNode.widget)) return null;

    const insertIndex = getWidgetChildren(targetNode.widget).length;
    return {
      asset,
      parentPath: targetPath,
      insertIndex,
      nextPath: insertedWidgetPathForParent(targetNode.widget, targetPath, insertIndex),
    };
  }

  const target = arrayChildSegment(targetPath);
  if (!target) return null;

  const parentPath = targetPath.slice(0, -1);
  const parentNode = nodeAtPath(nodes, parentPath);
  if (!parentNode || !canAddChildren(parentNode.widget)) return null;

  const insertIndex = target.index + (placement === 'after' ? 1 : 0);
  return {
    asset,
    parentPath,
    insertIndex,
    nextPath: insertedWidgetPathForParent(parentNode.widget, parentPath, insertIndex),
  };
}

function parentTypeForNode(
  nodes: ReturnType<typeof collectWidgetNodes>,
  path: WidgetPath,
): string | undefined {
  if (path.length === 0) return undefined;
  const parentPath = path.slice(0, -1);
  const parentKey = widgetPathKey(parentPath);
  return nodes.find((node) => widgetPathKey(node.path) === parentKey)?.widget.type;
}

function resolveDropPlacementFromEvent(
  event: DragEvent<HTMLLIElement>,
  targetWidget: GenericWidget,
): WidgetTreeDropPlacement {
  const rect = event.currentTarget.getBoundingClientRect();
  const offset = event.clientY - rect.top;
  const height = Math.max(1, rect.height);

  if (canAddChildren(targetWidget)) {
    if (offset < height / 3) return 'before';
    if (offset > (height * 2) / 3) return 'after';
    return 'inside';
  }

  return offset < height / 2 ? 'before' : 'after';
}

export function WidgetTreeView({
  root,
  parseError,
  selection,
  onSelectPath,
  onDeletePath,
  onMovePath,
  onPlaceAssetPath,
}: WidgetTreeViewProps) {
  const nodes = useMemo(() => (root ? collectWidgetNodes(root) : []), [root]);
  const selectedPath = selection ? firstSelectedWidgetPath(selection) : null;
  const selectedPathKey = selectedPath ? widgetPathKey(selectedPath) : null;
  const [collapsedPathKeys, setCollapsedPathKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [dragPath, setDragPath] = useState<WidgetPath | null>(null);
  const [dropTarget, setDropTarget] = useState<WidgetTreeDropTarget | null>(null);
  const visibleNodes = useMemo(
    () => filterVisibleWidgetNodes(nodes, collapsedPathKeys),
    [collapsedPathKeys, nodes],
  );
  const selectedIndex = selectedNodeIndex(visibleNodes, selection);

  useEffect(() => {
    if (!selectedPath) return;

    setCollapsedPathKeys((current) => {
      let changed = false;
      const next = new Set(current);

      for (let depth = 0; depth < selectedPath.length; depth++) {
        const ancestorKey = widgetPathKey(selectedPath.slice(0, depth));
        if (next.delete(ancestorKey)) {
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [selectedPathKey, selectedPath]);

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      const operation = resolveWidgetTreeMoveOperation(
        nodes,
        selection,
        event.key === 'ArrowUp' ? 'up' : 'down',
      );
      if (operation && onMovePath) {
        event.preventDefault();
        onMovePath(operation);
      }
      return;
    }

    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      const nextPath = resolveWidgetTreeNavigationPath(visibleNodes, selection, event.key);
      if (nextPath) {
        event.preventDefault();
        onSelectPath?.(nextPath);
      }
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const current = visibleNodes[selectedIndex];
      if (current && !isRootWidgetPath(current.path)) {
        event.preventDefault();
        onDeletePath?.(current.path);
      }
    }
  };

  const handleToggleCollapse = (path: WidgetPath, isCollapsed: boolean) => {
    const pathKey = widgetPathKey(path);

    setCollapsedPathKeys((current) => {
      const next = new Set(current);
      if (isCollapsed) {
        next.delete(pathKey);
      } else {
        next.add(pathKey);
      }
      return next;
    });

    if (
      !isCollapsed &&
      selectedPath &&
      isPathPrefix(path, selectedPath) &&
      !widgetPathEquals(path, selectedPath)
    ) {
      onSelectPath?.(path);
    }
  };

  const handleDragStart = (event: DragEvent<HTMLLIElement>, path: WidgetPath) => {
    if (!onMovePath || isRootWidgetPath(path)) {
      event.preventDefault();
      return;
    }

    setDragPath(path);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-workbench-widget-path', widgetPathKey(path));
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>, targetNode: WidgetNode) => {
    const asset = onPlaceAssetPath ? readWidgetPlacementAssetDragData(event.dataTransfer) : null;
    if (asset) {
      const placement = resolveDropPlacementFromEvent(event, targetNode.widget);
      const operation = resolveWidgetTreeAssetDropOperation(
        nodes,
        asset,
        targetNode.path,
        placement,
      );
      const targetKey = widgetPathKey(targetNode.path);
      if (!operation) {
        setDropTarget((current) => (current?.pathKey === targetKey ? null : current));
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setDropTarget({ pathKey: targetKey, placement });
      return;
    }

    if (!dragPath) return;

    const placement = resolveDropPlacementFromEvent(event, targetNode.widget);
    const operation = resolveWidgetTreeDropOperation(nodes, dragPath, targetNode.path, placement);
    const targetKey = widgetPathKey(targetNode.path);
    if (!operation) {
      setDropTarget((current) => (current?.pathKey === targetKey ? null : current));
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget({ pathKey: targetKey, placement });
  };

  const handleDragLeave = (event: DragEvent<HTMLLIElement>, path: WidgetPath) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;

    const targetKey = widgetPathKey(path);
    setDropTarget((current) => (current?.pathKey === targetKey ? null : current));
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, targetNode: WidgetNode) => {
    const asset = onPlaceAssetPath ? readWidgetPlacementAssetDragData(event.dataTransfer) : null;
    if (asset) {
      const placement =
        dropTarget?.pathKey === widgetPathKey(targetNode.path)
          ? dropTarget.placement
          : resolveDropPlacementFromEvent(event, targetNode.widget);
      const operation = resolveWidgetTreeAssetDropOperation(
        nodes,
        asset,
        targetNode.path,
        placement,
      );
      if (!operation) {
        setDropTarget(null);
        return;
      }

      event.preventDefault();
      onPlaceAssetPath?.(operation);
      setDragPath(null);
      setDropTarget(null);
      return;
    }

    if (!dragPath || !onMovePath) return;

    const placement =
      dropTarget?.pathKey === widgetPathKey(targetNode.path)
        ? dropTarget.placement
        : resolveDropPlacementFromEvent(event, targetNode.widget);
    const operation = resolveWidgetTreeDropOperation(nodes, dragPath, targetNode.path, placement);
    if (!operation) {
      setDropTarget(null);
      return;
    }

    event.preventDefault();
    onMovePath(operation);
    setDragPath(null);
    setDropTarget(null);
  };

  return (
    <Panel className="widget-tree-outline" data-testid="widget-tree-outline-panel">
      <PanelBody className="widget-tree-outline__body">
        {parseError !== null ? (
          <EmptyState compact icon="codicon-error">
            {parseError}
          </EmptyState>
        ) : root === null ? (
          <EmptyState compact icon="codicon-list-tree">
            No widget root.
          </EmptyState>
        ) : (
          <ul
            aria-label="Widget outline"
            aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Delete Backspace"
            className="widget-tree-outline__list"
            role="tree"
            onKeyDown={handleKeyDown}
          >
            {visibleNodes.map((node) => {
              const pathKey = widgetPathKey(node.path);
              const depth = node.path.length;
              const isSelected = selection
                ? isWidgetPathSelected(selection, node.path)
                : isRootWidgetPath(node.path);
              const parentType = parentTypeForNode(nodes, node.path);
              const placementMeta = formatWidgetPlacementMeta(node.widget, parentType);
              const canMove = Boolean(onMovePath && !isRootWidgetPath(node.path));
              const hasChildren = hasCollapsibleWidgetChildren(node.widget);
              const isCollapsed = collapsedPathKeys.has(pathKey);
              const dropPlacement = dropTarget?.pathKey === pathKey ? dropTarget.placement : null;
              const displayLabel = getWidgetDisplayLabel(node.widget);
              const textPreview =
                node.widget.type === 'text' && typeof node.widget.text === 'string'
                  ? node.widget.text
                  : null;

              return (
                <li
                  key={pathKey}
                  aria-level={depth + 1}
                  aria-expanded={hasChildren ? !isCollapsed : undefined}
                  aria-selected={isSelected}
                  className={cx(
                    'widget-tree-outline__item',
                    isSelected && 'widget-tree-outline__item--selected',
                    canMove && 'widget-tree-outline__item--movable',
                    dropPlacement && `widget-tree-outline__item--drop-${dropPlacement}`,
                  )}
                  data-drop-position={dropPlacement ?? undefined}
                  data-testid={`widget-tree-node-${pathKey}`}
                  draggable={canMove}
                  role="treeitem"
                  style={{ paddingLeft: `${depth * 14 + 6}px` }}
                  onDragEnd={() => {
                    setDragPath(null);
                    setDropTarget(null);
                  }}
                  onDragLeave={(event) => handleDragLeave(event, node.path)}
                  onDragOver={(event) => handleDragOver(event, node)}
                  onDragStart={(event) => handleDragStart(event, node.path)}
                  onDrop={(event) => handleDrop(event, node)}
                >
                  {hasChildren ? (
                    <button
                      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${displayLabel}`}
                      className="widget-tree-outline__twistie"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggleCollapse(node.path, isCollapsed);
                      }}
                    >
                      {isCollapsed ? '▸' : '▾'}
                    </button>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="widget-tree-outline__twistie widget-tree-outline__twistie--spacer"
                    />
                  )}
                  <button
                    className="widget-tree-outline__button"
                    tabIndex={isSelected ? 0 : -1}
                    type="button"
                    onClick={() => onSelectPath?.(node.path)}
                  >
                    <span className="widget-tree-outline__type">{displayLabel}</span>
                    {placementMeta ? (
                      <span className="widget-tree-outline__placement">{placementMeta}</span>
                    ) : null}
                    {textPreview ? (
                      <span className="widget-tree-outline__meta">{textPreview}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
