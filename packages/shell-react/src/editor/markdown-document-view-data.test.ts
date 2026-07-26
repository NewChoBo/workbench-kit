import { describe, expect, it } from 'vitest';

import {
  BUILTIN_EDITOR_MARKDOWN_PREVIEW_RENDER_KIND,
  isBuiltinEditorMarkdownPreviewRenderData,
} from './markdown-document-view-data.js';

describe('builtin.editor markdown preview render data', () => {
  it('recognizes markdown preview markers', () => {
    expect(
      isBuiltinEditorMarkdownPreviewRenderData({
        kind: BUILTIN_EDITOR_MARKDOWN_PREVIEW_RENDER_KIND,
      }),
    ).toBe(true);
    expect(isBuiltinEditorMarkdownPreviewRenderData({ kind: 'other' })).toBe(false);
    expect(isBuiltinEditorMarkdownPreviewRenderData(null)).toBe(false);
  });
});
