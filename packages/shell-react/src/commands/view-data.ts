export const BUILTIN_COMMANDS_VIEW_RENDER_KIND = 'workbench-kit.builtin.commands.view' as const;
export const BUILTIN_COMMANDS_VIEW_CONTAINER_ID = 'commands' as const;

export interface BuiltinCommandsViewRenderData {
  readonly kind: typeof BUILTIN_COMMANDS_VIEW_RENDER_KIND;
}

export function isBuiltinCommandsViewRenderData(
  value: unknown,
): value is BuiltinCommandsViewRenderData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    (value as BuiltinCommandsViewRenderData).kind === BUILTIN_COMMANDS_VIEW_RENDER_KIND
  );
}
