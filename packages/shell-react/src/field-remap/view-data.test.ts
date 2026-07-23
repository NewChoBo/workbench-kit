import { describe, expect, it } from 'vitest';

import {
  isSampleFieldRemapViewRenderData,
  SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND,
} from './view-data.js';

describe('isSampleFieldRemapViewRenderData', () => {
  it('accepts the sample schema mapper render kind', () => {
    expect(
      isSampleFieldRemapViewRenderData({
        kind: SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND,
      }),
    ).toBe(true);
  });

  it('rejects unrelated render payloads', () => {
    expect(
      isSampleFieldRemapViewRenderData({
        kind: 'workbench-kit.samples.jdw.view',
      }),
    ).toBe(false);
    expect(isSampleFieldRemapViewRenderData(null)).toBe(false);
  });
});
