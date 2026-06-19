const KEYBINDING_TOKEN_LABELS: Readonly<Record<string, string>> = {
  alt: 'Alt',
  ctrl: 'Ctrl',
  delete: 'Delete',
  down: 'Down',
  enter: 'Enter',
  escape: 'Esc',
  left: 'Left',
  meta: 'Cmd',
  right: 'Right',
  shift: 'Shift',
  space: 'Space',
  tab: 'Tab',
  up: 'Up',
};

export function formatKeybindingLabel(key: string): string {
  return key
    .split('+')
    .filter(Boolean)
    .map((token) => {
      const normalized = token.trim().toLowerCase();
      const mapped = KEYBINDING_TOKEN_LABELS[normalized];
      if (mapped) {
        return mapped;
      }

      if (normalized.length === 1) {
        return normalized.toUpperCase();
      }

      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join('+');
}
