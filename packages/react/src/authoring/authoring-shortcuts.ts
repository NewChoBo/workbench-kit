export interface AuthoringShortcutHandlers {
  onDelete?: (() => void) | undefined;
  onRedo?: (() => void) | undefined;
  onUndo?: (() => void) | undefined;
}

export interface AuthoringShortcutState {
  canDelete?: boolean | undefined;
  canRedo?: boolean | undefined;
  canUndo?: boolean | undefined;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof target !== 'object' || target === null || !('tagName' in target)) {
    return false;
  }
  const element = target as { tagName?: string; isContentEditable?: boolean };
  const tag = element.tagName?.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return element.isContentEditable === true;
}

export function handleAuthoringShortcutKeyDown(
  event: KeyboardEvent,
  handlers: AuthoringShortcutHandlers,
  state: AuthoringShortcutState,
): boolean {
  if (isEditableTarget(event.target)) {
    return false;
  }

  const mod = event.ctrlKey || event.metaKey;

  if (mod && !event.shiftKey && event.key.toLowerCase() === 'z' && state.canUndo) {
    event.preventDefault();
    handlers.onUndo?.();
    return true;
  }

  if (
    mod &&
    (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))
  ) {
    if (!state.canRedo) {
      return false;
    }
    event.preventDefault();
    handlers.onRedo?.();
    return true;
  }

  if (!mod && event.key === 'Delete' && state.canDelete) {
    event.preventDefault();
    handlers.onDelete?.();
    return true;
  }

  return false;
}
