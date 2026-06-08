import type { GenericWidget, WidgetPath } from '@workbench-kit/json-widget';
import {
  ROOT_WIDGET_PATH,
  appendBoxChildPath,
  appendChildrenPath,
  widgetPathKey,
} from '@workbench-kit/json-widget';

import { getWidgetChildren, widgetDisplayName } from './tree-model.js';

function widgetMatchesQuery(widget: GenericWidget, query: string): boolean {
  const label = widgetDisplayName(widget).toLowerCase();
  const type = widget.type.toLowerCase();
  const id = typeof widget.id === 'string' ? widget.id.toLowerCase() : '';
  return label.includes(query) || type.includes(query) || id.includes(query);
}

function visitSubtree(
  widget: GenericWidget,
  path: WidgetPath,
  query: string,
  visible: Set<string>,
): boolean {
  const pathKey = widgetPathKey(path);
  const children = getWidgetChildren(widget);
  let subtreeHasMatch = widgetMatchesQuery(widget, query);

  children.forEach((child, index) => {
    const childPath =
      child === widget.child ? appendBoxChildPath(path) : appendChildrenPath(path, index);
    if (visitSubtree(child, childPath, query, visible)) {
      subtreeHasMatch = true;
    }
  });

  if (subtreeHasMatch) {
    visible.add(pathKey);
  }

  return subtreeHasMatch;
}

/** Returns visible path keys when filtering; `null` means show all nodes. */
export function buildVisibleTreePathKeys(root: GenericWidget, query: string): Set<string> | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const visible = new Set<string>();
  visitSubtree(root, ROOT_WIDGET_PATH, normalized, visible);
  return visible;
}
