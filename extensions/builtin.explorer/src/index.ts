/** Phase 0 placeholder — explorer extension activation arrives in a later phase. */
export const EXTENSION_ID = 'workbench-kit.builtin.explorer' as const;

export function activate(): { dispose(): void } {
  return { dispose() {} };
}
