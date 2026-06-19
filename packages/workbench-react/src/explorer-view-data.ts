export const BUILTIN_EXPLORER_VIEW_RENDER_KIND = 'workbench-kit.builtin.explorer.view' as const;
export const BUILTIN_EXPLORER_MOVE_COMMAND_ID = 'workbench-kit.builtin.explorer.move' as const;
export const BUILTIN_EXPLORER_REFRESH_COMMAND_ID =
  'workbench-kit.builtin.explorer.refresh' as const;

export interface BuiltinExplorerViewRenderData {
  readonly kind: typeof BUILTIN_EXPLORER_VIEW_RENDER_KIND;
}

export function isBuiltinExplorerViewRenderData(
  value: unknown,
): value is BuiltinExplorerViewRenderData {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === BUILTIN_EXPLORER_VIEW_RENDER_KIND
  );
}
