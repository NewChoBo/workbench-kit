import { normalizeWidgetForParent } from './widget-normalize.js';
import type { GenericWidget, WidgetTreeEditResult } from './widget-tree.js';
import {
  getWidgetAtPath,
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
    case 'insert-child': {
      const parent = getWidgetAtPath(root, patch.parentPath);
      if (!parent) {
        return { root, changed: false };
      }

      const child = normalizeWidgetForParent(patch.child, parent);
      return insertWidgetChildAtPath(root, patch.parentPath, patch.index, child);
    }
    case 'set-box-child':
      return setBoxChildAtPath(root, patch.boxPath, patch.child);
    case 'remove-widget':
      return removeWidgetAtPath(root, patch.path);
    case 'reorder-child':
      return reorderWidgetChildAtPath(root, patch.parentPath, patch.fromIndex, patch.toIndex);
    case 'reparent-widget': {
      const targetParent = getWidgetAtPath(root, patch.toParentPath);
      const child = getWidgetAtPath(root, patch.fromPath);
      if (!targetParent || !child) {
        return { root, changed: false };
      }

      const prepared = replaceWidgetAtPath(
        root,
        patch.fromPath,
        normalizeWidgetForParent(child, targetParent),
      );
      return reparentWidgetAtPath(
        prepared.root,
        patch.fromPath,
        patch.toParentPath,
        patch.insertIndex,
      );
    }
  }
}
