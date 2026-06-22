import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EDITOR_PANE_VISIBILITY,
  editorViewModeToPaneVisibility,
  getVisibleEditorPaneKinds,
  sanitizeEditorPaneVisibility,
  toggleEditorPaneVisibility,
} from './editor-pane-visibility.js';

describe('editor-pane-visibility', () => {
  it('defaults to code on and form/preview off', () => {
    expect(DEFAULT_EDITOR_PANE_VISIBILITY).toEqual({
      code: true,
      form: false,
      preview: false,
    });
  });

  it('maps preview view mode to preview-only visibility', () => {
    expect(editorViewModeToPaneVisibility('preview')).toEqual({
      code: false,
      form: false,
      preview: true,
    });
  });

  it('maps form view mode to form-only visibility', () => {
    expect(editorViewModeToPaneVisibility('form')).toEqual({
      code: false,
      form: true,
      preview: false,
    });
  });

  it('prevents turning off the last visible pane', () => {
    expect(toggleEditorPaneVisibility({ code: true, form: false, preview: false }, 'code')).toEqual(
      {
        code: true,
        form: false,
        preview: false,
      },
    );
  });

  it('allows split visibility when multiple panes can be shown', () => {
    expect(
      toggleEditorPaneVisibility({ code: true, form: false, preview: false }, 'preview'),
    ).toEqual({
      code: true,
      form: false,
      preview: true,
    });
  });

  it('returns visible pane kinds in stable order', () => {
    expect(
      getVisibleEditorPaneKinds({
        code: true,
        form: true,
        preview: true,
      }),
    ).toEqual(['code', 'form', 'preview']);
  });

  it('drops ineligible panes and falls back to code when none remain', () => {
    expect(
      sanitizeEditorPaneVisibility(
        { code: false, form: true, preview: true },
        { formEligible: false, previewEligible: false },
      ),
    ).toEqual({
      code: true,
      form: false,
      preview: false,
    });
  });
});
