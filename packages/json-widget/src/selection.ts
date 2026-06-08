import type { WidgetPath } from './path.js';
import { parseWidgetPathKey, widgetPathKey } from './path.js';

export interface WidgetSelectionState {
  readonly pathKeys: ReadonlySet<string>;
}

export interface WidgetPathSelectOptions {
  readonly additive?: boolean | undefined;
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

export function selectWidgetPathWithOptions(
  state: WidgetSelectionState,
  path: WidgetPath,
  options?: WidgetPathSelectOptions,
): WidgetSelectionState {
  const key = widgetPathKey(path);
  if (options?.additive) {
    const next = new Set(state.pathKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    return { pathKeys: next };
  }
  return selectWidgetPath(state, path);
}

export function isWidgetPathSelected(state: WidgetSelectionState, path: WidgetPath): boolean {
  return state.pathKeys.has(widgetPathKey(path));
}

export function firstSelectedWidgetPath(state: WidgetSelectionState): WidgetPath | null {
  const firstKey = [...state.pathKeys][0];
  if (!firstKey) return null;
  return parseWidgetPathKey(firstKey);
}

export function selectedWidgetPaths(state: WidgetSelectionState): WidgetPath[] {
  return [...state.pathKeys].map((key) => parseWidgetPathKey(key));
}
