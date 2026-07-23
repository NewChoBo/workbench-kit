import { useEffect } from 'react';

/** Set on document.body when an editor that handles Ctrl+S has focus. */
export const WORKBENCH_ACTIVE_EDITOR_SAVE_SHORTCUT_ATTRIBUTE = 'data-active-editor-save-shortcut';

interface SaveShortcutEvent {
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
}

export function isWorkbenchSaveShortcutEvent(event: SaveShortcutEvent): boolean {
  return event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey);
}

export function hasWorkbenchModalDialogOpen(): boolean {
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
}

/** Disables the browser's native right-click context menu globally. */
export function useWorkbenchNativeContextMenuGuard(): void {
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);
}

/**
 * Prevents the browser's native "Save as" dialog on Ctrl+S / Cmd+S everywhere
 * except when an active editor (marked with WORKBENCH_ACTIVE_EDITOR_SAVE_SHORTCUT_ATTRIBUTE)
 * has focus and no modal is open — in that case the editor handles the shortcut itself.
 */
export function useWorkbenchNativeSaveGuard(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isWorkbenchSaveShortcutEvent(event)) return;

      const editorActive = document.body.hasAttribute(
        WORKBENCH_ACTIVE_EDITOR_SAVE_SHORTCUT_ATTRIBUTE,
      );
      if (editorActive && !hasWorkbenchModalDialogOpen()) return;

      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
