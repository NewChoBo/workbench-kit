import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import {
  createWorkbenchStandaloneEditorTabContextMenuItems,
  type WorkbenchStandaloneEditorTabLike,
} from './editorTabContextMenu';

export type WorkbenchEditorTabCommandFocusDisposition = 'active-tab' | 'none';

export interface WorkbenchEditorTabCommandFocusEvent {
  readonly source: 'builtin' | 'extra';
  readonly itemId: string;
  readonly targetTabId: string;
}

type PendingFocusSettlement = {
  readonly menu: HTMLElement | null;
  readonly tablist: HTMLElement;
  readonly token: number;
};

export interface UseWorkbenchEditorTabContextMenuOptions {
  readonly getExtraTabContextMenuItems?:
    ((tabId: string) => readonly ContextMenuItem[] | undefined) | undefined;
  readonly onClose: (tabId: string) => void;
  readonly onCloseAll?: (() => void) | undefined;
  readonly onCloseOthers?: ((tabId: string) => void) | undefined;
  readonly onCloseToRight?: ((tabId: string) => void) | undefined;
  readonly onSelectTab?: ((tabId: string) => void) | undefined;
  readonly resolveContextMenuCommandFocus?:
    | ((
        event: WorkbenchEditorTabCommandFocusEvent,
      ) =>
        | WorkbenchEditorTabCommandFocusDisposition
        | PromiseLike<WorkbenchEditorTabCommandFocusDisposition>)
    | undefined;
  readonly tabs: readonly WorkbenchStandaloneEditorTabLike[];
}

export interface UseWorkbenchEditorTabContextMenuResult {
  readonly contextMenu: ReactNode;
  /** Invalidates pending command focus settlement before forwarding the supplied selection. */
  readonly onSelectTab: (tabId: string) => void;
  readonly onTabContextMenu: (tabId: string, event: ReactMouseEvent<HTMLElement>) => void;
}

export function useWorkbenchEditorTabContextMenu({
  getExtraTabContextMenuItems,
  onClose,
  onCloseAll,
  onCloseOthers,
  onCloseToRight,
  onSelectTab,
  resolveContextMenuCommandFocus,
  tabs,
}: UseWorkbenchEditorTabContextMenuOptions): UseWorkbenchEditorTabContextMenuResult {
  const settlementGenerationRef = useRef(0);
  const capturedTablistRef = useRef<HTMLElement | null>(null);
  const [resolvedSettlement, setResolvedSettlement] = useState<PendingFocusSettlement | null>(null);
  const [menuState, setMenuState] = useState<{
    returnFocusTarget: HTMLElement;
    tablist: HTMLElement | null;
    tabId: string;
    x: number;
    y: number;
  } | null>(null);

  const invalidatePendingSettlement = useCallback(() => {
    settlementGenerationRef.current += 1;
  }, []);

  useEffect(
    () => () => {
      settlementGenerationRef.current += 1;
      capturedTablistRef.current = null;
    },
    [],
  );

  useLayoutEffect(() => {
    if (!resolvedSettlement) {
      return;
    }
    const { menu, tablist, token } = resolvedSettlement;
    if (
      settlementGenerationRef.current !== token ||
      capturedTablistRef.current !== tablist ||
      !tablist.isConnected
    ) {
      return;
    }

    const activeElement = document.activeElement;
    if (
      activeElement instanceof Element &&
      activeElement.isConnected &&
      activeElement !== document.body &&
      activeElement !== document.documentElement &&
      !tablist.contains(activeElement) &&
      !menu?.contains(activeElement)
    ) {
      return;
    }

    const activeTab = tablist.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (activeTab?.isConnected) {
      activeTab.focus();
      return;
    }
    tablist.tabIndex = -1;
    tablist.focus();
  }, [resolvedSettlement]);

  const handleSelectTab = useCallback(
    (tabId: string) => {
      invalidatePendingSettlement();
      onSelectTab?.(tabId);
    },
    [invalidatePendingSettlement, onSelectTab],
  );

  const onTabContextMenu = useCallback(
    (tabId: string, event: ReactMouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      invalidatePendingSettlement();
      const tablist = event.currentTarget.closest<HTMLElement>('[role="tablist"]');
      capturedTablistRef.current = tablist;
      onSelectTab?.(tabId);
      setMenuState({
        returnFocusTarget: event.currentTarget,
        tablist,
        tabId,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [invalidatePendingSettlement, onSelectTab],
  );

  let contextMenuItems: ContextMenuItem[] = [];
  if (menuState && tabs.some((tab) => tab.id === menuState.tabId)) {
    const extraItems = getExtraTabContextMenuItems?.(menuState.tabId) ?? [];
    const extraItemSet = new Set(extraItems);
    contextMenuItems = createWorkbenchStandaloneEditorTabContextMenuItems({
      getExtraTabContextMenuItems: extraItems.length > 0 ? () => extraItems : undefined,
      onClose,
      onCloseAll,
      onCloseOthers,
      onCloseToRight,
      tabId: menuState.tabId,
      tabs,
    }).map((item) => {
      if (item.type === 'separator') {
        return item;
      }
      const source = extraItemSet.has(item) ? 'extra' : 'builtin';
      return {
        ...item,
        onSelect: () => {
          const token = settlementGenerationRef.current + 1;
          settlementGenerationRef.current = token;
          const activeElement = document.activeElement;
          const menu =
            activeElement instanceof HTMLElement
              ? activeElement.closest<HTMLElement>('[role="menu"]')
              : null;
          item.onSelect();

          const itemId = typeof item.id === 'string' && item.id.trim() !== '' ? item.id : null;
          if (!resolveContextMenuCommandFocus || !itemId) {
            return;
          }

          let disposition:
            | WorkbenchEditorTabCommandFocusDisposition
            | PromiseLike<WorkbenchEditorTabCommandFocusDisposition>;
          try {
            disposition = resolveContextMenuCommandFocus({
              source,
              itemId,
              targetTabId: menuState.tabId,
            });
          } catch {
            return;
          }
          void Promise.resolve(disposition).then(
            (resolved) => {
              if (
                resolved !== 'active-tab' ||
                settlementGenerationRef.current !== token ||
                !menuState.tablist ||
                capturedTablistRef.current !== menuState.tablist ||
                !menuState.tablist.isConnected
              ) {
                return;
              }
              setResolvedSettlement({ menu, tablist: menuState.tablist, token });
            },
            () => undefined,
          );
        },
      };
    });
  }

  const contextMenu =
    menuState && tabs.some((tab) => tab.id === menuState.tabId) ? (
      <ContextMenu
        ariaLabel="Editor tab menu"
        items={contextMenuItems}
        returnFocusTarget={menuState.returnFocusTarget}
        x={menuState.x}
        y={menuState.y}
        onClose={() => setMenuState(null)}
      />
    ) : null;

  return {
    contextMenu,
    onSelectTab: handleSelectTab,
    onTabContextMenu,
  };
}
