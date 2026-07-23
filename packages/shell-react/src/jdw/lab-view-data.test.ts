import { describe, expect, it } from 'vitest';

import {
  isSampleJdwLabViewRenderData,
  SAMPLE_JDW_LAB_VIEW_RENDER_KIND,
} from './lab-view-data.js';

describe('isSampleJdwLabViewRenderData', () => {
  it('accepts the canonical JDW template and widget-tree paths', () => {
    expect(
      isSampleJdwLabViewRenderData({
        kind: SAMPLE_JDW_LAB_VIEW_RENDER_KIND,
        templateJdwPath: 'jdw/templates/analytics-dashboard.jdw.json',
        widgetTreePath: 'jdw/showcase/example.jdw.json',
      }),
    ).toBe(true);
  });

  it('rejects the removed Screen Spec lab field', () => {
    expect(
      isSampleJdwLabViewRenderData({
        kind: SAMPLE_JDW_LAB_VIEW_RENDER_KIND,
        screenSpecLabPath: 'labs/screen-spec.lab.json',
        widgetTreePath: 'jdw/showcase/example.jdw.json',
      }),
    ).toBe(false);
  });
});
