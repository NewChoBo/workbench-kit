export const SAMPLE_JDW_WIDGET_FORM_RENDER_KIND = 'workbench-kit.samples.jdw.widget-form' as const;
export const SAMPLE_JDW_WIDGET_PREVIEW_RENDER_KIND =
  'workbench-kit.samples.jdw.widget-preview' as const;

export interface SampleJdwWidgetFormRenderData {
  readonly kind: typeof SAMPLE_JDW_WIDGET_FORM_RENDER_KIND;
}

export interface SampleJdwWidgetPreviewRenderData {
  readonly kind: typeof SAMPLE_JDW_WIDGET_PREVIEW_RENDER_KIND;
}

export function isSampleJdwWidgetFormRenderData(
  value: unknown,
): value is SampleJdwWidgetFormRenderData {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === SAMPLE_JDW_WIDGET_FORM_RENDER_KIND
  );
}

export function isSampleJdwWidgetPreviewRenderData(
  value: unknown,
): value is SampleJdwWidgetPreviewRenderData {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === SAMPLE_JDW_WIDGET_PREVIEW_RENDER_KIND
  );
}
