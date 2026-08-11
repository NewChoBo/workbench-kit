export type EditorViewMode = 'code' | 'form' | 'preview';

export type EditorPaneKind = 'code' | 'form' | 'preview';

export interface EditorPaneVisibility {
  readonly code: boolean;
  readonly form: boolean;
  readonly preview: boolean;
}

export const DEFAULT_EDITOR_PANE_VISIBILITY: EditorPaneVisibility = {
  code: true,
  form: false,
  preview: false,
};

export function editorViewModeToPaneVisibility(mode: EditorViewMode): EditorPaneVisibility {
  switch (mode) {
    case 'form':
      return {
        code: false,
        form: true,
        preview: false,
      };
    case 'preview':
      return {
        code: false,
        form: false,
        preview: true,
      };
    case 'code':
    default:
      return DEFAULT_EDITOR_PANE_VISIBILITY;
  }
}

export function resolveDefaultEditorPaneVisibility(
  defaultViewMode: EditorViewMode | undefined,
  options: { readonly formEligible?: boolean | undefined } = {},
): EditorPaneVisibility {
  if (defaultViewMode !== undefined) {
    return editorViewModeToPaneVisibility(defaultViewMode);
  }

  if (options.formEligible) {
    return editorViewModeToPaneVisibility('form');
  }

  return DEFAULT_EDITOR_PANE_VISIBILITY;
}

/**
 * Maps pane visibility to the exclusive icon-select value (viewport).
 * If multiple panes are somehow visible, prefers preview → form → code.
 */
export function paneVisibilityToPrimaryViewMode(visibility: EditorPaneVisibility): EditorViewMode {
  const exclusive =
    Number(visibility.code) + Number(visibility.form) + Number(visibility.preview) === 1;
  if (exclusive) {
    if (visibility.preview) return 'preview';
    if (visibility.form) return 'form';
    return 'code';
  }

  if (visibility.preview) return 'preview';
  if (visibility.form) return 'form';
  return 'code';
}

export function countVisibleEditorPanes(visibility: EditorPaneVisibility): number {
  return Number(visibility.code) + Number(visibility.form) + Number(visibility.preview);
}

export function resolveEffectiveEditorPaneVisibility(
  preference: EditorPaneVisibility,
  options: { formEligible: boolean; previewEligible: boolean },
): EditorPaneVisibility {
  const effective: EditorPaneVisibility = {
    code: preference.code,
    form: preference.form && options.formEligible,
    preview: preference.preview && options.previewEligible,
  };

  if (countVisibleEditorPanes(effective) === 0) {
    return DEFAULT_EDITOR_PANE_VISIBILITY;
  }

  return effective;
}

export function getVisibleEditorPaneKinds(visibility: EditorPaneVisibility): EditorPaneKind[] {
  const kinds: EditorPaneKind[] = [];

  if (visibility.code) {
    kinds.push('code');
  }

  if (visibility.form) {
    kinds.push('form');
  }

  if (visibility.preview) {
    kinds.push('preview');
  }

  return kinds;
}
