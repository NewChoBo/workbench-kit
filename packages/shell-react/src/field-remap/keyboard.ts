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
