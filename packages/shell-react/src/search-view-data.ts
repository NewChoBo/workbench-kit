export const BUILTIN_SEARCH_VIEW_RENDER_KIND = 'workbench-kit.builtin.search.view' as const;

export interface BuiltinSearchViewRenderData {
  readonly kind: typeof BUILTIN_SEARCH_VIEW_RENDER_KIND;
}

export function isBuiltinSearchViewRenderData(
  value: unknown,
): value is BuiltinSearchViewRenderData {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === BUILTIN_SEARCH_VIEW_RENDER_KIND
  );
}
