import type { GenericWidget, WidgetTreeEditResult } from './widget-tree.js';
import { replaceWidgetAtPath } from './widget-tree.js';
import type { WidgetPath } from './path.js';

export type WidgetPatch = {
  readonly type: 'replace-widget';
  readonly path: WidgetPath;
  readonly widget: GenericWidget;
};

export function applyWidgetPatch(root: GenericWidget, patch: WidgetPatch): WidgetTreeEditResult {
  if (patch.type === 'replace-widget') {
    return replaceWidgetAtPath(root, patch.path, patch.widget);
  }

  return { root, changed: false };
}
