export type EditorViewMode = 'code' | 'form' | 'preview';

export interface EditorPaneVisibility {
  readonly previewVisible: boolean;
  readonly sourceVisible: boolean;
}

export type EditorSourceKind = 'code' | 'form';

export interface EditorPaneLayoutState extends EditorPaneVisibility {
  readonly sourceKind: EditorSourceKind;
}

export const DEFAULT_EDITOR_PANE_VISIBILITY: EditorPaneVisibility = {
  previewVisible: false,
  sourceVisible: true,
};

export const DEFAULT_EDITOR_PANE_LAYOUT: EditorPaneLayoutState = {
  ...DEFAULT_EDITOR_PANE_VISIBILITY,
  sourceKind: 'code',
};

export function editorViewModeToPaneLayout(mode: EditorViewMode): EditorPaneLayoutState {
  switch (mode) {
    case 'form':
      return {
        previewVisible: false,
        sourceKind: 'form',
        sourceVisible: true,
      };
    case 'preview':
      return {
        previewVisible: true,
        sourceKind: 'code',
        sourceVisible: false,
      };
    case 'code':
    default:
      return DEFAULT_EDITOR_PANE_LAYOUT;
  }
}

export function resolveDefaultEditorPaneLayout(
  defaultViewMode: EditorViewMode | undefined,
): EditorPaneLayoutState {
  return defaultViewMode ? editorViewModeToPaneLayout(defaultViewMode) : DEFAULT_EDITOR_PANE_LAYOUT;
}

export function toggleEditorPaneVisibility(
  visibility: EditorPaneVisibility,
  pane: keyof EditorPaneVisibility,
): EditorPaneVisibility {
  const nextValue = !visibility[pane];

  if (!nextValue && !visibility[pane === 'sourceVisible' ? 'previewVisible' : 'sourceVisible']) {
    return visibility;
  }

  return {
    ...visibility,
    [pane]: nextValue,
  };
}

export function withEditorSourceKind(
  layout: EditorPaneLayoutState,
  sourceKind: EditorSourceKind,
): EditorPaneLayoutState {
  return {
    ...layout,
    sourceKind,
    sourceVisible: true,
  };
}
