import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';
import { SideBarList, SideBarListItem } from './SideBarViewFrame';

/**
 * Controlled sidebar tree for library / provider category rows.
 *
 * Branch vs leaf: items with `children` (even empty) render as expandable branches;
 * items without `children` are leaves. Hosts own expand/selection sets.
 *
 * Keyboard (default on): ArrowUp/Down move focus+selection (single mode) or focus
 * (multi mode); ArrowRight expands / moves into first child; ArrowLeft collapses /
 * moves to parent; Enter/Space activates selection. Virtualization and DnD are
 * out of scope for v1.
 */
export interface SideBarTreeItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly children?: readonly SideBarTreeItem[];
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
}

export type SideBarTreeSelectionMode = 'single' | 'multi';

export interface SideBarTreeProps {
  readonly items: readonly SideBarTreeItem[];
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
    <SideBarList
      aria-label={ariaLabel}
      className={cx('ui-sidebar-tree', className)}
      fill
      role="tree"
      onKeyDown={handleKeyDown}
    >
      {visibleNodes.map((node, index) => {
        const { item, depth, hasChildren } = node;
        const expanded = hasChildren && expandedIds.has(item.id);
        const selected = selectedIds.has(item.id);
        const focused = focusIndex === index;

        return (
          <SideBarListItem
            key={item.id}
            depth={depth}
            disabled={item.disabled}
            selected={selected}
            tabIndex={focused ? 0 : -1}
            wrapperProps={{
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
  );
}
