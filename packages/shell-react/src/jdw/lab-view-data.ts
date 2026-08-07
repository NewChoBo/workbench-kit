export const SAMPLE_JDW_LAB_VIEW_RENDER_KIND = 'workbench-kit.samples.jdw.view' as const;
export const SAMPLE_JDW_LAB_VIEW_ID = 'workbench-kit.samples.jdw.panel' as const;

export interface SampleJdwLabViewRenderData {
  readonly kind: typeof SAMPLE_JDW_LAB_VIEW_RENDER_KIND;
  readonly templateJdwPath: string;
  readonly widgetTreePath: string;
}

export function isSampleJdwLabViewRenderData(value: unknown): value is SampleJdwLabViewRenderData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as {
    kind?: unknown;
    templateJdwPath?: unknown;
    widgetTreePath?: unknown;
  };

  return (
    candidate.kind === SAMPLE_JDW_LAB_VIEW_RENDER_KIND &&
    typeof candidate.templateJdwPath === 'string' &&
    typeof candidate.widgetTreePath === 'string'
  );
}
