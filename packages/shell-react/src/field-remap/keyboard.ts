import type { KeyboardEvent } from 'react';
import type { FieldRemapHistoryActions } from './history.js';

const EDITABLE_SHORTCUT_TARGET = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="textbox"]',
  '[data-field-remap-shortcuts="ignore"]',
].join(', ');

export function isFieldRemapEditableShortcutTarget(target: EventTarget | null): boolean {
  return (
    typeof Element !== 'undefined' &&
    target instanceof Element &&
    target.closest(EDITABLE_SHORTCUT_TARGET) !== null
  );
}

/** Consumes only an available history shortcut within the caller's existing keyboard scope. */
export function handleFieldRemapHistoryKeyDown(
  event: KeyboardEvent<HTMLElement>,
  actions: FieldRemapHistoryActions | undefined,
  readOnly = false,
): boolean {
  if (
    readOnly ||
    !actions ||
    event.defaultPrevented ||
    event.altKey ||
    (!event.ctrlKey && !event.metaKey) ||
    isFieldRemapEditableShortcutTarget(event.target)
  ) {
    return false;
  }

  const key = event.key.toLowerCase();
  const requestsUndo = key === 'z' && !event.shiftKey;
  const requestsRedo =
    (key === 'z' && event.shiftKey) ||
    (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey);
  if (
    (!requestsUndo && !requestsRedo) ||
    (requestsUndo && !actions.canUndo) ||
    (requestsRedo && !actions.canRedo)
  ) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  if (requestsUndo) {
    actions.undo();
  } else {
    actions.redo();
  }
  return true;
}
