import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EDITOR_PANE_LAYOUT,
  editorViewModeToPaneLayout,
  toggleEditorPaneVisibility,
  withEditorSourceKind,
} from './editor-pane-visibility.js';

describe('editor-pane-visibility', () => {
  it('defaults to source on and preview off', () => {
    expect(DEFAULT_EDITOR_PANE_LAYOUT).toEqual({
      previewVisible: false,
      sourceKind: 'code',
      sourceVisible: true,
    });
  });

  it('maps legacy preview view mode to preview-only layout', () => {
    expect(editorViewModeToPaneLayout('preview')).toEqual({
      previewVisible: true,
      sourceKind: 'code',
      sourceVisible: false,
    });
  });

  it('prevents turning off the last visible pane', () => {
    expect(
      toggleEditorPaneVisibility(
        { previewVisible: false, sourceVisible: true },
        'sourceVisible',
      ),
    ).toEqual({
      previewVisible: false,
      sourceVisible: true,
    });
  });

  it('allows split visibility when both panes can be shown', () => {
    expect(
      toggleEditorPaneVisibility(
        { previewVisible: false, sourceVisible: true },
        'previewVisible',
      ),
    ).toEqual({
      previewVisible: true,
      sourceVisible: true,
    });
  });

  it('switches source kind and keeps source visible', () => {
    expect(
      withEditorSourceKind(
        { previewVisible: true, sourceKind: 'code', sourceVisible: false },
        'form',
      ),
    ).toEqual({
      previewVisible: true,
      sourceKind: 'form',
      sourceVisible: true,
    });
  });
});
