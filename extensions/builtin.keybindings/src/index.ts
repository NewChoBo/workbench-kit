/** Reserved built-in extension for workspace keybinding contribution ownership. */
export const EXTENSION_ID = 'workbench-kit.builtin.keybindings' as const;

export function activate(): { dispose(): void } {
  return { dispose() {} };
}
