export const SAMPLE_SCHEMA_MAPPER_VIEW_RENDER_KIND =
  'workbench-kit.samples.schema-mapper.view' as const;

export interface SampleSchemaMapperViewRenderData {
  readonly kind: typeof SAMPLE_SCHEMA_MAPPER_VIEW_RENDER_KIND;
}

export function isSampleSchemaMapperViewRenderData(
  value: unknown,
): value is SampleSchemaMapperViewRenderData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (value as { kind?: unknown }).kind === SAMPLE_SCHEMA_MAPPER_VIEW_RENDER_KIND;
}
