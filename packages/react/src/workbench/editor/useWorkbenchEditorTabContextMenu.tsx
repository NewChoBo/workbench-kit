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

/** Host-selected focus disposition after its controlled command state is ready. */
export type WorkbenchEditorTabCommandFocusDisposition = 'active-tab' | 'none';

/** Stable editor-tab-local identity for one activated built-in or identified extra command. */
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

type PendingConnectivityObservation = {
  readonly observer: MutationObserver;
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
  /**
   * Runs after the existing menu action. A Promise is a host-readiness signal and should resolve
   * only after controlled tabs and selection are committed. `active-tab` focuses the current
   * selected tab or the tablist fallback; `none`, throws, and rejections do not move focus. Only
   * built-ins and extra items with a stable non-empty `id` participate. Omission preserves the
   * existing command-activation behavior.
   */
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
  /**
   * Invalidates pending command focus settlement before forwarding the supplied selection.
   * Additive and optional for source compatibility; the hook currently always supplies it.
   */
  readonly onSelectTab?: ((tabId: string) => void) | undefined;
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
  const connectivityObservationRef = useRef<PendingConnectivityObservation | null>(null);
  const [resolvedSettlement, setResolvedSettlement] = useState<PendingFocusSettlement | null>(null);
  const [menuState, setMenuState] = useState<{
    returnFocusTarget: HTMLElement;
    tablist: HTMLElement | null;
    tabId: string;
    x: number;
    y: number;
  } | null>(null);

  const stopConnectivityObservation = useCallback((token?: number) => {
    const observation = connectivityObservationRef.current;
    if (!observation || (token !== undefined && observation.token !== token)) {
      return;
    }
    observation.observer.disconnect();
    connectivityObservationRef.current = null;
  }, []);

  const invalidatePendingSettlement = useCallback(() => {
    settlementGenerationRef.current += 1;
    stopConnectivityObservation();
    setResolvedSettlement(null);
  }, [stopConnectivityObservation]);

  const observeCapturedTablist = useCallback(
    (tablist: HTMLElement | null, token: number) => {
      stopConnectivityObservation();
      const MutationObserverConstructor = tablist?.ownerDocument.defaultView?.MutationObserver;
      if (!tablist?.isConnected || !MutationObserverConstructor) {
        return;
      }
      const capturedAncestorChain = new Set<Node>();
      for (let ancestor: Node | null = tablist; ancestor; ancestor = ancestor.parentNode) {
        capturedAncestorChain.add(ancestor);
      }
      const observer = new MutationObserverConstructor((records) => {
        const capturedTablistWasRemoved = records.some((record) =>
          Array.from(record.removedNodes).some(
            (removedNode) =>
              removedNode === tablist ||
              capturedAncestorChain.has(removedNode) ||
              removedNode.contains(tablist),
          ),
        );
        if (!capturedTablistWasRemoved || settlementGenerationRef.current !== token) {
          return;
        }
        settlementGenerationRef.current += 1;
        stopConnectivityObservation(token);
        setResolvedSettlement((current) => (current?.token === token ? null : current));
      });
      observer.observe(tablist.ownerDocument, { childList: true, subtree: true });
      connectivityObservationRef.current = { observer, token };
    },
    [stopConnectivityObservation],
  );

  useEffect(
    () => () => {
      settlementGenerationRef.current += 1;
      stopConnectivityObservation();
      capturedTablistRef.current = null;
    },
    [stopConnectivityObservation],
  );

  useLayoutEffect(() => {
    if (!resolvedSettlement) {
      return;
    }
    const { menu, tablist, token } = resolvedSettlement;
    const finish = () => {
      stopConnectivityObservation(token);
      setResolvedSettlement((current) => (current?.token === token ? null : current));
    };
    if (
      settlementGenerationRef.current !== token ||
      capturedTablistRef.current !== tablist ||
      !tablist.isConnected
    ) {
      finish();
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
      finish();
      return;
    }

    const activeTab = tablist.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (activeTab?.isConnected) {
      activeTab.focus();
      finish();
      return;
    }
    tablist.tabIndex = -1;
    tablist.focus();
    finish();
  }, [resolvedSettlement, stopConnectivityObservation]);

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
          const itemId = typeof item.id === 'string' && item.id.trim() !== '' ? item.id : null;
          if (resolveContextMenuCommandFocus && itemId) {
            observeCapturedTablist(menuState.tablist, token);
          }
          try {
            item.onSelect();
          } catch (error) {
            stopConnectivityObservation(token);
            throw error;
          }

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
            stopConnectivityObservation(token);
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
                stopConnectivityObservation(token);
                return;
              }
              setResolvedSettlement({ menu, tablist: menuState.tablist, token });
            },
            () => stopConnectivityObservation(token),
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
