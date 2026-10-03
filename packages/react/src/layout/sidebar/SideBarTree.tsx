import {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';
import { resolveTreeDropPlacement } from '../../utils/tree-drop-placement';
import { SideBarList, SideBarListItem } from './SideBarViewFrame';

/**
 * Controlled sidebar tree for library / provider category rows.
 *
 * Branch vs leaf: items with `children` (even empty) render as expandable branches;
 * items without `children` are leaves. Hosts own expand/selection sets.
 *
 * Keyboard (default on): ArrowUp/Down move focus+selection (single mode) or focus
 * (multi mode); ArrowRight expands / moves into first child; ArrowLeft collapses /
 * moves to parent; Enter/Space activates selection. Optional controlled DnD only
 * proposes destinations; the host admits and commits them. Virtualization is out of scope.
 */
export interface SideBarTreeItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly children?: readonly SideBarTreeItem[];
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
}

export type SideBarTreeSelectionMode = 'single' | 'multi';
export type SideBarTreeDropPlacement = 'before' | 'inside' | 'after';
export interface SideBarTreeDropOperation {
  readonly sourceId: string;
  readonly targetId: string;
  readonly placement: SideBarTreeDropPlacement;
}
export type SideBarTreeDropFeedback =
  | { readonly accepted: true; readonly message: string }
  | { readonly accepted: false; readonly reason: string; readonly message: string };
export interface SideBarTreeDragAndDrop {
  /** Change when the authored source changes to invalidate a gesture. */
  readonly revisionKey: string | number;
  readonly canDrag: (sourceId: string) => boolean;
  /** Prepare only the latest exact preview outside native dragover. Pending drops are rejected. */
  readonly deferredFeedback?: {
    readonly pendingMessage: string;
    readonly unavailableMessage: string;
  };
  /** Pure destination preview; never install a document here. */
  readonly getDropFeedback: (operation: SideBarTreeDropOperation) => SideBarTreeDropFeedback;
  /** Synchronous authoritative commit. Rejection means no move was committed. */
  readonly onDrop: (operation: SideBarTreeDropOperation) => SideBarTreeDropFeedback;
}

interface SideBarTreeDropPreview {
  readonly operation: SideBarTreeDropOperation;
  readonly feedback: SideBarTreeDropFeedback;
  readonly revisionKey: string | number;
  readonly config: SideBarTreeDragAndDrop;
  readonly pending: boolean;
}

export interface SideBarTreeProps {
  readonly items: readonly SideBarTreeItem[];
  readonly dragAndDrop?: SideBarTreeDragAndDrop;
  readonly expandedIds: ReadonlySet<string>;
  readonly selectedIds: ReadonlySet<string>;
  readonly onExpandedIdsChange: (next: Set<string>) => void;
  readonly onSelectedIdsChange: (next: Set<string>) => void;
  readonly selectionMode?: SideBarTreeSelectionMode;
  /** When false, arrow / activation keys are not handled. Default true. */
  readonly keyboardNavigation?: boolean;
  readonly 'aria-label'?: string;
  readonly className?: string;
}

export interface SideBarTreeVisibleNode {
  readonly depth: number;
  readonly item: SideBarTreeItem;
  readonly parentId: string | null;
  readonly hasChildren: boolean;
}

export function isSideBarTreeBranch(item: SideBarTreeItem): boolean {
  return item.children !== undefined;
}

export function flattenVisibleSideBarTreeItems(
  items: readonly SideBarTreeItem[],
  expandedIds: ReadonlySet<string>,
  depth = 0,
  parentId: string | null = null,
): SideBarTreeVisibleNode[] {
  const rows: SideBarTreeVisibleNode[] = [];

  for (const item of items) {
    const hasChildren = isSideBarTreeBranch(item);
    rows.push({ depth, item, parentId, hasChildren });

    if (hasChildren && expandedIds.has(item.id) && item.children) {
      rows.push(...flattenVisibleSideBarTreeItems(item.children, expandedIds, depth + 1, item.id));
    }
  }

  return rows;
}

export function toggleSideBarTreeId(ids: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(ids);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function selectSideBarTreeIds(
  current: ReadonlySet<string>,
  id: string,
  mode: SideBarTreeSelectionMode,
  additive: boolean,
): Set<string> {
  if (mode === 'single' || !additive) {
    return new Set([id]);
  }
  return toggleSideBarTreeId(current, id);
}

export function SideBarTree({
  items,
  dragAndDrop,
  expandedIds,
  selectedIds,
  onExpandedIdsChange,
  onSelectedIdsChange,
  selectionMode = 'single',
  keyboardNavigation = true,
  'aria-label': ariaLabel = 'Sidebar tree',
  className,
}: SideBarTreeProps) {
  const visibleNodes = useMemo(
    () => flattenVisibleSideBarTreeItems(items, expandedIds),
    [expandedIds, items],
  );

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const activeDrag = useRef<{ sourceId: string; revisionKey: string | number } | null>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterDrop = useRef<string | null>(null);
  const configRef = useRef(dragAndDrop);
  const feedbackGeneration = useRef(0);
  const feedbackTimer = useRef<number | null>(null);
  const preparedPreview = useRef<SideBarTreeDropPreview | null>(null);
  const [dropTarget, setDropTarget] = useState<SideBarTreeDropPreview | null>(null);
  const [dropMessage, setDropMessage] = useState('');
  const retireFeedback = useCallback(() => {
    feedbackGeneration.current += 1;
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null;
    preparedPreview.current = null;
  }, []);
  const clearPreview = useCallback(() => {
    retireFeedback();
    setDropTarget(null);
    setDropMessage('');
  }, [retireFeedback]);
  const clearDrag = useCallback(() => {
    activeDrag.current = null;
    clearPreview();
  }, [clearPreview]);
  useEffect(() => {
    if (configRef.current !== dragAndDrop) {
      configRef.current = dragAndDrop;
      clearPreview();
    }
    const drag = activeDrag.current;
    if (
      drag &&
      (!dragAndDrop ||
        drag.revisionKey !== dragAndDrop.revisionKey ||
        !dragAndDrop.canDrag(drag.sourceId) ||
        !visibleNodes.some(({ item }) => item.id === drag.sourceId && !item.disabled))
    )
      clearDrag();
    const target = preparedPreview.current?.operation.targetId;
    if (target && !visibleNodes.some(({ item }) => item.id === target && !item.disabled))
      clearPreview();
    if (focusAfterDrop.current) {
      const id = focusAfterDrop.current;
      focusAfterDrop.current = null;
      buttonRefs.current.get(id)?.focus({ preventScroll: true });
    }
  }, [clearDrag, clearPreview, dragAndDrop, visibleNodes, dropMessage]);
  useEffect(() => {
    const cancel = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || !activeDrag.current) return;
      event.preventDefault();
      event.stopPropagation();
      clearDrag();
    };
    // Capture before an enclosing editor interprets Escape as leaving Edit.
    document.addEventListener('keydown', cancel, true);
    return () => {
      document.removeEventListener('keydown', cancel, true);
      activeDrag.current = null;
      retireFeedback();
    };
  }, [clearDrag, retireFeedback]);

  const feedbackFor = (
    config: SideBarTreeDragAndDrop,
    operation: SideBarTreeDropOperation,
  ): SideBarTreeDropFeedback => {
    try {
      return config.getDropFeedback(operation);
    } catch (error) {
      if (!config.deferredFeedback) throw error;
      return {
        accepted: false,
        reason: 'unavailable',
        message: config.deferredFeedback.unavailableMessage,
      };
    }
  };
  const destination = (
    event: DragEvent<HTMLLIElement>,
    node: SideBarTreeVisibleNode,
    committing = false,
  ): SideBarTreeDropPreview | null => {
    const drag = activeDrag.current;
    const config = dragAndDrop;
    if (
      !drag ||
      !config ||
      drag.revisionKey !== config.revisionKey ||
      !config.canDrag(drag.sourceId) ||
      node.item.disabled
    )
      return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const operation: SideBarTreeDropOperation = {
      sourceId: drag.sourceId,
      targetId: node.item.id,
      placement: resolveTreeDropPlacement({
        canContain: node.hasChildren,
        insideOnly: items.length === 1 && node.parentId === null,
        offsetY: event.clientY - rect.top,
        height: rect.height,
      }),
    };
    if (!config.deferredFeedback)
      return {
        operation,
        feedback: feedbackFor(config, operation),
        revisionKey: drag.revisionKey,
        config,
        pending: false,
      };
    const prepared = preparedPreview.current;
    const matches =
      prepared?.config === config &&
      prepared.revisionKey === drag.revisionKey &&
      prepared.operation.sourceId === operation.sourceId &&
      prepared.operation.targetId === operation.targetId &&
      prepared.operation.placement === operation.placement;
    const pending: SideBarTreeDropPreview = {
      operation,
      revisionKey: drag.revisionKey,
      config,
      pending: true,
      feedback: {
        accepted: false,
        reason: 'pending',
        message: config.deferredFeedback.pendingMessage,
      },
    };
    if (committing) {
      // Never turn an unprepared release into an accepted move. Verified drops still revalidate.
      if (!matches || prepared.pending) return pending;
      return prepared.feedback.accepted
        ? { ...prepared, feedback: feedbackFor(config, operation) }
        : prepared;
    }
    if (matches) return prepared;
    retireFeedback();
    preparedPreview.current = pending;
    const generation = feedbackGeneration.current;
    // End native dragover before expensive host admission. Only the latest proposal survives.
    feedbackTimer.current = window.setTimeout(() => {
      const current = activeDrag.current;
      if (
        generation !== feedbackGeneration.current ||
        configRef.current !== config ||
        current?.revisionKey !== drag.revisionKey ||
        current.sourceId !== drag.sourceId
      )
        return;
      const feedback = feedbackFor(config, operation);
      if (
        generation !== feedbackGeneration.current ||
        configRef.current !== config ||
        activeDrag.current !== current
      )
        return;
      feedbackTimer.current = null;
      const ready = { ...pending, feedback, pending: false };
      preparedPreview.current = ready;
      setDropTarget(ready);
      setDropMessage(feedback.message);
    }, 0);
    return pending;
  };

  const focusIndex = useMemo(() => {
    if (focusedId == null) {
      return visibleNodes.length > 0 ? 0 : -1;
    }
    const index = visibleNodes.findIndex((node) => node.item.id === focusedId);
    return index >= 0 ? index : visibleNodes.length > 0 ? 0 : -1;
  }, [focusedId, visibleNodes]);

  const toggleExpanded = useCallback(
    (id: string) => {
      onExpandedIdsChange(toggleSideBarTreeId(expandedIds, id));
    },
    [expandedIds, onExpandedIdsChange],
  );

  const selectItem = useCallback(
    (id: string, additive: boolean) => {
      onSelectedIdsChange(selectSideBarTreeIds(selectedIds, id, selectionMode, additive));
      setFocusedId(id);
    },
    [onSelectedIdsChange, selectedIds, selectionMode],
  );

  const handleItemClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, node: SideBarTreeVisibleNode) => {
      if (node.item.disabled) {
        return;
      }

      const additive = selectionMode === 'multi' && (event.metaKey || event.ctrlKey);
      selectItem(node.item.id, additive);

      if (node.hasChildren && !additive) {
        toggleExpanded(node.item.id);
      }
    },
    [selectItem, selectionMode, toggleExpanded],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLUListElement>) => {
      if (!keyboardNavigation || visibleNodes.length === 0 || focusIndex < 0) {
        return;
      }

      const current = visibleNodes[focusIndex];
      if (!current) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = visibleNodes[Math.min(visibleNodes.length - 1, focusIndex + 1)];
        if (!next || next.item.disabled) {
          return;
        }
        setFocusedId(next.item.id);
        if (selectionMode === 'single') {
          onSelectedIdsChange(new Set([next.item.id]));
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const next = visibleNodes[Math.max(0, focusIndex - 1)];
        if (!next || next.item.disabled) {
          return;
        }
        setFocusedId(next.item.id);
        if (selectionMode === 'single') {
          onSelectedIdsChange(new Set([next.item.id]));
        }
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (!current.hasChildren || current.item.disabled) {
          return;
        }
        if (!expandedIds.has(current.item.id)) {
          toggleExpanded(current.item.id);
          return;
        }
        const firstChild = current.item.children?.[0];
        if (firstChild && !firstChild.disabled) {
          setFocusedId(firstChild.id);
          if (selectionMode === 'single') {
            onSelectedIdsChange(new Set([firstChild.id]));
          }
        }
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (current.hasChildren && expandedIds.has(current.item.id)) {
          toggleExpanded(current.item.id);
          return;
        }
        if (current.parentId) {
          setFocusedId(current.parentId);
          if (selectionMode === 'single') {
            onSelectedIdsChange(new Set([current.parentId]));
          }
        }
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (current.item.disabled) {
          return;
        }
        selectItem(current.item.id, selectionMode === 'multi' && (event.metaKey || event.ctrlKey));
        if (current.hasChildren && selectionMode === 'single') {
          toggleExpanded(current.item.id);
        }
      }
    },
    [
      expandedIds,
      focusIndex,
      keyboardNavigation,
      onSelectedIdsChange,
      selectItem,
      selectionMode,
      toggleExpanded,
      visibleNodes,
    ],
  );

  return (
    <>
      <SideBarList
        aria-label={ariaLabel}
        className={cx('ui-sidebar-tree', className)}
        fill
        role="tree"
        onKeyDown={handleKeyDown}
        onDragLeave={(event) => {
          if (
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)
          )
            return;
          if (event.relatedTarget === null) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX >= rect.left &&
              event.clientX <= rect.right &&
              event.clientY >= rect.top &&
              event.clientY <= rect.bottom
            )
              return;
          }
          clearDrag();
        }}
      >
        {visibleNodes.map((node, index) => {
          const { item, depth, hasChildren } = node;
          const expanded = hasChildren && expandedIds.has(item.id);
          const selected = selectedIds.has(item.id);
          const focused = focusIndex === index;
          const preview =
            dropTarget?.revisionKey === dragAndDrop?.revisionKey &&
            dropTarget?.operation.targetId === item.id
              ? dropTarget
              : null;

          return (
            <SideBarListItem
              key={item.id}
              ref={(element) => {
                if (element) buttonRefs.current.set(item.id, element);
                else buttonRefs.current.delete(item.id);
              }}
              data-sidebar-tree-id={item.id}
              depth={depth}
              disabled={item.disabled}
              selected={selected}
              tabIndex={focused ? 0 : -1}
              wrapperProps={{
                draggable: !!dragAndDrop && !item.disabled && dragAndDrop.canDrag(item.id),
                ...{
                  'data-drop-placement': preview?.operation.placement,
                  'data-drop-accepted':
                    preview && !preview.pending ? String(preview.feedback.accepted) : undefined,
                  'data-drop-pending': preview?.pending ? 'true' : undefined,
                },
                onDragStart: (event) => {
                  if (!dragAndDrop || item.disabled || !dragAndDrop.canDrag(item.id)) {
                    event.preventDefault();
                    return;
                  }
                  clearPreview();
                  activeDrag.current = { sourceId: item.id, revisionKey: dragAndDrop.revisionKey };
                  event.dataTransfer.effectAllowed = 'move';
                  // A marker only: external payloads are never read or admitted.
                  event.dataTransfer.setData(
                    'application/vnd.workbench-kit.sidebar-tree-item',
                    item.id,
                  );
                },
                onDragEnd: () => {
                  if (activeDrag.current) clearDrag();
                },
                onDragOver: (event) => {
                  const next = destination(event, node);
                  if (!next) {
                    clearPreview();
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = next.feedback.accepted ? 'move' : 'none';
                  setDropTarget(next);
                  setDropMessage(next.feedback.message);
                },
                onDrop: (event) => {
                  const next = destination(event, node, true);
                  if (!next) {
                    clearDrag();
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  const feedback = next.feedback.accepted
                    ? dragAndDrop!.onDrop(next.operation)
                    : next.feedback;
                  clearDrag();
                  setDropMessage(feedback.message);
                  if (feedback.accepted) {
                    setFocusedId(next.operation.sourceId);
                    focusAfterDrop.current = next.operation.sourceId;
                  }
                },
                role: 'treeitem',
                'aria-level': depth + 1,
                'aria-selected': selected,
                ...(hasChildren ? { 'aria-expanded': expanded } : {}),
              }}
              onClick={(event) => handleItemClick(event, node)}
              onFocus={() => setFocusedId(item.id)}
            >
              <span className="workbench-tree-prefix">
                {hasChildren ? (
                  <i
                    aria-hidden="true"
                    className={cxCodicon(
                      expanded ? 'chevron-down' : 'chevron-right',
                      'workbench-tree-chevron',
                    )}
                  />
                ) : (
                  <span className="workbench-tree-spacer" />
                )}
                {item.icon}
              </span>
              <span className="workbench-tree-label">{item.label}</span>
            </SideBarListItem>
          );
        })}
      </SideBarList>
      {dragAndDrop ? (
        <p className="ui-sidebar-tree-drop-status" role="status" aria-live="polite">
          {dropMessage}
        </p>
      ) : null}
    </>
  );
}
