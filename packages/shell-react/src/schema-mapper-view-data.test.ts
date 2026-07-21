import { describe, expect, it } from 'vitest';

import {
  isSampleSchemaMapperViewRenderData,
  SAMPLE_SCHEMA_MAPPER_VIEW_RENDER_KIND,
} from './schema-mapper-view-data.js';

describe('isSampleSchemaMapperViewRenderData', () => {
  it('accepts the sample schema mapper render kind', () => {
    expect(
      isSampleSchemaMapperViewRenderData({
        kind: SAMPLE_SCHEMA_MAPPER_VIEW_RENDER_KIND,
      }),
    ).toBe(true);
  });

  it('rejects unrelated render payloads', () => {
    expect(
      isSampleSchemaMapperViewRenderData({
        kind: 'workbench-kit.samples.jdw.view',
      }),
    ).toBe(false);
    expect(isSampleSchemaMapperViewRenderData(null)).toBe(false);
  });
});
