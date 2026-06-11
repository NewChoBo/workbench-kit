/** Phase 0 placeholder — hello-world sample activation arrives in a later phase. */
export const EXTENSION_ID = 'workbench-kit.samples.hello-world' as const;

export function activate(): { dispose(): void } {
  return { dispose() {} };
}
