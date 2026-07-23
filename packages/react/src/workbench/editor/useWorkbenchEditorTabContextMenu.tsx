import { useCallback, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';

import { ContextMenu } from '../../overlay/ContextMenu';
import {
  createWorkbenchStandaloneEditorTabContextMenuItems,
  type WorkbenchStandaloneEditorTabLike,
} from './editorTabContextMenu';

export interface UseWorkbenchEditorTabContextMenuOptions {
  readonly onClose: (tabId: string) => void;
  readonly onCloseAll?: (() => void) | undefined;
  readonly onCloseOthers?: ((tabId: string) => void) | undefined;
  readonly onSelectTab?: ((tabId: string) => void) | undefined;
  readonly tabs: readonly WorkbenchStandaloneEditorTabLike[];
}

export interface UseWorkbenchEditorTabContextMenuResult {
  readonly contextMenu: ReactNode;
  readonly onTabContextMenu: (tabId: string, event: ReactMouseEvent<HTMLElement>) => void;
}

export function useWorkbenchEditorTabContextMenu({
  onClose,
  onCloseAll,
  onCloseOthers,
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
          onClose,
          onCloseAll,
          onCloseOthers,
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
