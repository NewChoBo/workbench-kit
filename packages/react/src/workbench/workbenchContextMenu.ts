import type { MouseEvent } from 'react';

const NATIVE_CONTEXT_MENU_SELECTOR =
  'input, textarea, select, [contenteditable="true"], .monaco-editor, .workspace-editor__monaco, .cm-editor';

export function shouldAllowNativeBrowserContextMenu(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest(NATIVE_CONTEXT_MENU_SELECTOR));
}

export function suppressNativeBrowserContextMenu(event: MouseEvent<HTMLElement>) {
  if (!shouldAllowNativeBrowserContextMenu(event.target)) {
    event.preventDefault();
  }
}
