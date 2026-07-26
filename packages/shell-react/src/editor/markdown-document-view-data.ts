export const BUILTIN_EDITOR_MARKDOWN_PREVIEW_RENDER_KIND =
  'workbench-kit.builtin.editor.markdown-preview' as const;

export interface BuiltinEditorMarkdownPreviewRenderData {
  readonly kind: typeof BUILTIN_EDITOR_MARKDOWN_PREVIEW_RENDER_KIND;
}

export function isBuiltinEditorMarkdownPreviewRenderData(
  value: unknown,
): value is BuiltinEditorMarkdownPreviewRenderData {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === BUILTIN_EDITOR_MARKDOWN_PREVIEW_RENDER_KIND
  );
}
