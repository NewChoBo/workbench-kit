/** Phase 0 placeholder — accounts extension activation arrives in a later phase. */
export const EXTENSION_ID = 'workbench-kit.builtin.accounts' as const;

export function activate(): { dispose(): void } {
  return { dispose() {} };
}
