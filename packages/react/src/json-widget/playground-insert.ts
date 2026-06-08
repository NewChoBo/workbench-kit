import type { GenericWidget, WidgetPatch, WidgetPath } from '@workbench-kit/json-widget';
import {
  ROOT_WIDGET_PATH,
  applyWidgetPatchToDocument,
  createJsonWidgetEditorSyncSnapshot,
  emptyWidgetSelection,
  formatWidgetJson,
  getWidgetAtPath,
  getWidgetChildren,
  isContainerWidget,
} from '@workbench-kit/json-widget';

import type { PlaygroundWidgetTemplate } from './demo-playground-registry.js';

export interface InsertTarget {
  parentPath: WidgetPath;
  index: number;
}

export function resolveInsertTarget(
  root: GenericWidget,
  selectedPath: WidgetPath | null,
): InsertTarget {
  if (selectedPath !== null) {
    const selected = getWidgetAtPath(root, selectedPath);
    if (selected && isContainerWidget(selected)) {
      return {
        parentPath: selectedPath,
        index: getWidgetChildren(selected).length,
      };
    }

    if (selectedPath.length > 0) {
      const parentPath = selectedPath.slice(0, -1);
      const lastSegment = selectedPath[selectedPath.length - 1];
      if (lastSegment?.kind === 'children') {
        return { parentPath, index: lastSegment.index + 1 };
      }
      if (lastSegment?.kind === 'child') {
        return { parentPath: selectedPath.slice(0, -1), index: 0 };
      }
    }
  }

  return {
    parentPath: ROOT_WIDGET_PATH,
    index: getWidgetChildren(root).length,
  };
}

export function insertPlaygroundWidget(
  document: string,
  template: PlaygroundWidgetTemplate,
  selectedPath: WidgetPath | null,
): string | null {
  const snapshot = createJsonWidgetEditorSyncSnapshot({
    document,
    selection: emptyWidgetSelection(),
  });
  if (!snapshot.root) return null;

  const { parentPath, index } = resolveInsertTarget(snapshot.root, selectedPath);
  const parent = getWidgetAtPath(snapshot.root, parentPath);
  const siblingCount = parent ? getWidgetChildren(parent).length : 0;
  const child = template.create({ siblingCount });

  const patch: WidgetPatch = {
    type: 'insert-child',
    parentPath,
    index,
    child,
  };

  return applyWidgetPatchToDocument(snapshot, patch);
}

export function replaceRootWidget(document: string, widget: GenericWidget): string {
  const snapshot = createJsonWidgetEditorSyncSnapshot({
    document,
    selection: emptyWidgetSelection(),
  });
  if (!snapshot.root) {
    return formatWidgetJson(widget);
  }

  const next = applyWidgetPatchToDocument(snapshot, {
    type: 'replace-widget',
    path: ROOT_WIDGET_PATH,
    widget,
  });

  return next ?? formatWidgetJson(widget);
}
