export const BUILTIN_EXTENSIONS_VIEW_RENDER_KIND = 'workbench-kit.builtin.extensions.view' as const;
export const BUILTIN_EXTENSIONS_VIEW_CONTAINER_ID = 'extensions' as const;
export const BUILTIN_EXTENSIONS_FOCUS_COMMAND_ID =
  'workbench-kit.builtin.extensions.focus' as const;

export interface BuiltinExtensionsViewRenderData {
  readonly kind: typeof BUILTIN_EXTENSIONS_VIEW_RENDER_KIND;
}

export function isBuiltinExtensionsViewRenderData(
  value: unknown,
): value is BuiltinExtensionsViewRenderData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    (value as BuiltinExtensionsViewRenderData).kind === BUILTIN_EXTENSIONS_VIEW_RENDER_KIND
  );
}
