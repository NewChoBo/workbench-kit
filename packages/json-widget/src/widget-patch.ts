import type { GenericWidget, WidgetTreeEditResult } from './widget-tree.js';
import {
  insertWidgetChildAtPath,
  removeWidgetAtPath,
  reorderWidgetChildAtPath,
  replaceWidgetAtPath,
  reparentWidgetAtPath,
  setBoxChildAtPath,
} from './widget-tree.js';
import type { ArrayChildWidget } from './widget-child-ops.js';
import type { WidgetPath } from './path.js';

export type WidgetPatch =
  | {
      readonly type: 'replace-widget';
      readonly path: WidgetPath;
      readonly widget: GenericWidget;
    }
  | {
      readonly type: 'insert-child';
      readonly parentPath: WidgetPath;
      readonly index: number;
      readonly child: ArrayChildWidget;
    }
  | {
      readonly type: 'set-box-child';
      readonly boxPath: WidgetPath;
      readonly child: GenericWidget | undefined;
    }
  | {
      readonly type: 'remove-widget';
      readonly path: WidgetPath;
    }
  | {
      readonly type: 'reorder-child';
      readonly parentPath: WidgetPath;
      readonly fromIndex: number;
      readonly toIndex: number;
    }
  | {
      readonly type: 'reparent-widget';
      readonly fromPath: WidgetPath;
      readonly toParentPath: WidgetPath;
      readonly insertIndex: number;
    };

export function applyWidgetPatch(root: GenericWidget, patch: WidgetPatch): WidgetTreeEditResult {
  switch (patch.type) {
    case 'replace-widget':
      return replaceWidgetAtPath(root, patch.path, patch.widget);
    case 'insert-child':
      return insertWidgetChildAtPath(root, patch.parentPath, patch.index, patch.child);
    case 'set-box-child':
      return setBoxChildAtPath(root, patch.boxPath, patch.child);
    case 'remove-widget':
      return removeWidgetAtPath(root, patch.path);
    case 'reorder-child':
      return reorderWidgetChildAtPath(root, patch.parentPath, patch.fromIndex, patch.toIndex);
    case 'reparent-widget':
      return reparentWidgetAtPath(root, patch.fromPath, patch.toParentPath, patch.insertIndex);
  }
}
