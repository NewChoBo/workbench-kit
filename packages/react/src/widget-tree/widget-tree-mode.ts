export type WidgetTreeViewMode = 'code' | 'editor' | 'split' | 'design';

export const DEFAULT_WIDGET_TREE_VIEW_MODE: WidgetTreeViewMode = 'design';

export function resolveWidgetTreeLabMode(mode: WidgetTreeViewMode): 'code' | 'design' {
  return mode === 'code' ? 'code' : 'design';
}
