/** Phase 0 placeholder — keybindings extension activation arrives in a later phase. */
export const EXTENSION_ID = 'workbench-kit.builtin.keybindings' as const;

export function activate(): { dispose(): void } {
  return { dispose() {} };
}
