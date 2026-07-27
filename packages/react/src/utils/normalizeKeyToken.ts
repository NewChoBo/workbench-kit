/** Normalize a keyboard shortcut token to a stable lowercase key name. */
export function normalizeKeyToken(token: string): string {
  const key = token.trim().toLowerCase();
  if (key === 'del') return 'delete';
  if (key === 'esc') return 'escape';
  if (key === 'return') return 'enter';
  if (key === 'spacebar' || key === 'space') return 'space';
  if (key === 'arrowup' || key === 'up') return 'arrowup';
  if (key === 'arrowdown' || key === 'down') return 'arrowdown';
  if (key === 'arrowleft' || key === 'left') return 'arrowleft';
  if (key === 'arrowright' || key === 'right') return 'arrowright';
  return key;
}
