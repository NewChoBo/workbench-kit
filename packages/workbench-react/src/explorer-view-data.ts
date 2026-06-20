export const BUILTIN_EXPLORER_VIEW_RENDER_KIND = 'workbench-kit.builtin.explorer.view' as const;
export const BUILTIN_EXPLORER_VIEW_CONTAINER_ID = 'explorer' as const;
export const BUILTIN_EXPLORER_MOVE_COMMAND_ID = 'workbench-kit.builtin.explorer.move' as const;
export const BUILTIN_EXPLORER_REFRESH_COMMAND_ID =
  'workbench-kit.builtin.explorer.refresh' as const;
export const BUILTIN_EXPLORER_REVEAL_COMMAND_ID = 'workbench-kit.builtin.explorer.reveal' as const;
export const BUILTIN_EXPLORER_FOCUS_COMMAND_ID = 'workbench-kit.builtin.explorer.focus' as const;

interface ExplorerRevealCommandResult {
  readonly path?: string | undefined;
}

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

export function resolveExplorerRevealPath(input: unknown, result: unknown): string | undefined {
  const resultPath = readRevealPath(result);
  if (resultPath) {
    return resultPath;
  }

  return readRevealPath(input);
}

function readRevealPath(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const normalizedPath = value.trim();
    return normalizedPath.length > 0 ? normalizedPath : undefined;
  }

  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const record = value as ExplorerRevealCommandResult & {
    paths?: readonly string[] | undefined;
  };
  const directPath = typeof record.path === 'string' ? record.path.trim() : '';
  if (directPath) {
    return directPath;
  }

  const firstPath = record.paths?.find(
    (path) => typeof path === 'string' && path.trim().length > 0,
  );
  return firstPath?.trim();
}
