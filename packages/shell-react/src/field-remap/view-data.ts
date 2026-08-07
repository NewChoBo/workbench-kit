export const SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND =
  'workbench-kit.samples.field-remap.view' as const;
export const SAMPLE_FIELD_REMAP_VIEW_ID = 'workbench-kit.samples.field-remap.panel' as const;

export interface SampleFieldRemapViewRenderData {
  readonly kind: typeof SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND;
}

export function isSampleFieldRemapViewRenderData(
  value: unknown,
): value is SampleFieldRemapViewRenderData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (value as { kind?: unknown }).kind === SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND;
}
