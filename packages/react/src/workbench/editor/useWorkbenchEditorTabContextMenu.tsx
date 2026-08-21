import { useCallback, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';

import { ContextMenu, type ContextMenuItem } from '../../overlay/ContextMenu';
import {
  createWorkbenchStandaloneEditorTabContextMenuItems,
  type WorkbenchStandaloneEditorTabLike,
} from './editorTabContextMenu';

export interface UseWorkbenchEditorTabContextMenuOptions {
  readonly getExtraTabContextMenuItems?:
    ((tabId: string) => readonly ContextMenuItem[] | undefined) | undefined;
  readonly onClose: (tabId: string) => void;
  readonly onCloseAll?: (() => void) | undefined;
  readonly onCloseOthers?: ((tabId: string) => void) | undefined;
  readonly onCloseToRight?: ((tabId: string) => void) | undefined;
  readonly onSelectTab?: ((tabId: string) => void) | undefined;
  readonly tabs: readonly WorkbenchStandaloneEditorTabLike[];
}

export interface UseWorkbenchEditorTabContextMenuResult {
  readonly contextMenu: ReactNode;
  readonly onTabContextMenu: (tabId: string, event: ReactMouseEvent<HTMLElement>) => void;
}

export function useWorkbenchEditorTabContextMenu({
  getExtraTabContextMenuItems,
  onClose,
  onCloseAll,
  onCloseOthers,
  onCloseToRight,
  onSelectTab,
  tabs,
}: UseWorkbenchEditorTabContextMenuOptions): UseWorkbenchEditorTabContextMenuResult {
  const [menuState, setMenuState] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);

  const onTabContextMenu = useCallback(
    (tabId: string, event: ReactMouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onSelectTab?.(tabId);
      setMenuState({ tabId, x: event.clientX, y: event.clientY });
    },
    [onSelectTab],
  );

  const contextMenu =
    menuState && tabs.some((tab) => tab.id === menuState.tabId) ? (
      <ContextMenu
        ariaLabel="Editor tab menu"
        items={createWorkbenchStandaloneEditorTabContextMenuItems({
          getExtraTabContextMenuItems,
          onClose,
          onCloseAll,
          onCloseOthers,
          onCloseToRight,
          tabId: menuState.tabId,
          tabs,
        })}
        x={menuState.x}
        y={menuState.y}
        onClose={() => setMenuState(null)}
      />
    ) : null;

  return {
    contextMenu,
    onTabContextMenu,
  };
}
