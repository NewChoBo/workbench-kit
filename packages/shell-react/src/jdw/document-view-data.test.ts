import { describe, expect, it } from 'vitest';

import {
  isSampleJdwWidgetFormRenderData,
  isSampleJdwWidgetPreviewRenderData,
  SAMPLE_JDW_WIDGET_FORM_RENDER_KIND,
  SAMPLE_JDW_WIDGET_PREVIEW_RENDER_KIND,
} from './document-view-data.js';

describe('JDW document view render data', () => {
  it('recognizes form and preview markers', () => {
    expect(
      isSampleJdwWidgetFormRenderData({
        kind: SAMPLE_JDW_WIDGET_FORM_RENDER_KIND,
      }),
    ).toBe(true);
    expect(
      isSampleJdwWidgetPreviewRenderData({
        kind: SAMPLE_JDW_WIDGET_PREVIEW_RENDER_KIND,
      }),
    ).toBe(true);
    expect(isSampleJdwWidgetFormRenderData({ kind: 'other' })).toBe(false);
    expect(isSampleJdwWidgetPreviewRenderData(null)).toBe(false);
  });
});
