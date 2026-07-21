import { describe, expect, it } from 'vitest';

import {
  DEFAULT_EDITOR_PANE_VISIBILITY,
  editorViewModeToPaneVisibility,
  getVisibleEditorPaneKinds,
  paneVisibilityToPrimaryViewMode,
  resolveDefaultEditorPaneVisibility,
  resolveEffectiveEditorPaneVisibility,
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

  it('defaults to form when form is eligible and no explicit mode is set', () => {
    expect(resolveDefaultEditorPaneVisibility(undefined, { formEligible: true })).toEqual({
      code: false,
      form: true,
      preview: false,
    });
  });

  it('keeps an explicit code default even when form is eligible', () => {
    expect(resolveDefaultEditorPaneVisibility('code', { formEligible: true })).toEqual({
      code: true,
      form: false,
      preview: false,
    });
  });

  it('defaults to code when form is not eligible', () => {
    expect(resolveDefaultEditorPaneVisibility(undefined, { formEligible: false })).toEqual(
      DEFAULT_EDITOR_PANE_VISIBILITY,
    );
  });

  it('resolves exclusive visibility back to the primary view mode', () => {
    expect(paneVisibilityToPrimaryViewMode({ code: false, form: true, preview: false })).toBe(
      'form',
    );
    expect(paneVisibilityToPrimaryViewMode({ code: true, form: true, preview: false })).toBe(
      'form',
    );
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

  it('can enable an additional pane via legacy toggle helper', () => {
    expect(
      toggleEditorPaneVisibility({ code: true, form: false, preview: false }, 'preview'),
    ).toEqual({
      code: true,
      form: false,
      preview: true,
    });
  });

  it('sanitizes ineligible form/preview panes', () => {
    expect(
      sanitizeEditorPaneVisibility(
        { code: false, form: true, preview: true },
        { formEligible: false, previewEligible: true },
      ),
    ).toEqual({
      code: false,
      form: false,
      preview: true,
    });
  });

  it('falls back to code when no eligible panes remain', () => {
    const preference = { code: false, form: true, preview: true };
    expect(
      resolveEffectiveEditorPaneVisibility(preference, {
        formEligible: false,
        previewEligible: false,
      }),
    ).toEqual(DEFAULT_EDITOR_PANE_VISIBILITY);
  });

  it('lists visible panes in code → form → preview order', () => {
    expect(getVisibleEditorPaneKinds({ code: true, form: true, preview: true })).toEqual([
      'code',
      'form',
      'preview',
    ]);
  });
});
