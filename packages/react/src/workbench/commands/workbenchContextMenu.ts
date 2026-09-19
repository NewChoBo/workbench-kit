import type { MouseEvent } from 'react';

const NATIVE_CONTEXT_MENU_SELECTOR =
  'input, textarea, select, [data-native-context-menu="true"], .monaco-editor, .workspace-editor__monaco, .cm-editor';

/** Native controls, editor roots and explicit opt-ins take precedence over editable boundaries. */
export function shouldAllowNativeBrowserContextMenu(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false;
  }

  let element = target instanceof Element ? target : target.parentElement;
  if (element?.closest(NATIVE_CONTEXT_MENU_SELECTOR)) return true;

  while (element) {
    const editable = element.getAttribute('contenteditable')?.toLowerCase();
    if (editable === 'false') return false;
    if (editable === '' || editable === 'true' || editable === 'plaintext-only') return true;
    element = element.parentElement;
  }
  return false;
}

export function suppressNativeBrowserContextMenu(event: MouseEvent<HTMLElement>) {
  if (!shouldAllowNativeBrowserContextMenu(event.target)) {
    event.preventDefault();
  }
}
