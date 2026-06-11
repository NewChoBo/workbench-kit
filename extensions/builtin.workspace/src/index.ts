/** Phase 0 placeholder — workspace extension activation arrives in a later phase. */
export const EXTENSION_ID = 'workbench-kit.builtin.workspace' as const;

export function activate(): { dispose(): void } {
  return { dispose() {} };
}
