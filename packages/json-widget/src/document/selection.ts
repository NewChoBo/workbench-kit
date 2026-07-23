import type { WidgetPath } from './path.js';
import { parseWidgetPathKey, widgetPathKey } from './path.js';

export interface WidgetSelectionState {
  readonly pathKeys: ReadonlySet<string>;
}

export function emptyWidgetSelection(): WidgetSelectionState {
  return { pathKeys: new Set() };
}

export function selectWidgetPath(
  _state: WidgetSelectionState,
  path: WidgetPath,
): WidgetSelectionState {
  return { pathKeys: new Set([widgetPathKey(path)]) };
}

export function isWidgetPathSelected(state: WidgetSelectionState, path: WidgetPath): boolean {
  return state.pathKeys.has(widgetPathKey(path));
}

export function firstSelectedWidgetPath(state: WidgetSelectionState): WidgetPath | null {
  const firstKey = [...state.pathKeys][0];
  if (!firstKey) return null;
  return parseWidgetPathKey(firstKey);
}
