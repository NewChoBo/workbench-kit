import type { GenericWidget, WidgetPatch, WidgetPath } from '@workbench-kit/json-widget';
import {
  applyWidgetPatchToDocument,
  createJsonWidgetEditorSyncSnapshot,
  emptyWidgetSelection,
  getWidgetAtPath,
  ROOT_WIDGET_PATH,
} from '@workbench-kit/json-widget';

function cloneWidget(widget: GenericWidget): GenericWidget {
  return JSON.parse(JSON.stringify(widget)) as GenericWidget;
}

function stripWidgetId(widget: GenericWidget): GenericWidget {
  const { id: _id, ...rest } = widget;
  return rest;
}

export function deletePlaygroundWidget(
  document: string,
  selectedPath: WidgetPath | null,
): string | null {
  if (selectedPath === null || selectedPath.length === 0) {
    return null;
  }

  const snapshot = createJsonWidgetEditorSyncSnapshot({
    document,
    selection: emptyWidgetSelection(),
  });
  if (!snapshot.root) return null;

  const patch: WidgetPatch = {
    type: 'remove-widget',
    path: selectedPath,
  };

  return applyWidgetPatchToDocument(snapshot, patch);
}

export function duplicatePlaygroundWidget(
  document: string,
  selectedPath: WidgetPath | null,
): string | null {
  if (selectedPath === null || selectedPath.length === 0) {
    return null;
  }

  const snapshot = createJsonWidgetEditorSyncSnapshot({
    document,
    selection: emptyWidgetSelection(),
  });
  if (!snapshot.root) return null;

  const source = getWidgetAtPath(snapshot.root, selectedPath);
  if (!source) return null;

  const parentPath = selectedPath.slice(0, -1);
  const lastSegment = selectedPath[selectedPath.length - 1];
  if (!lastSegment || lastSegment.kind !== 'children') {
    return null;
  }

  const patch: WidgetPatch = {
    type: 'insert-child',
    parentPath: parentPath.length > 0 ? parentPath : ROOT_WIDGET_PATH,
    index: lastSegment.index + 1,
    child: stripWidgetId(cloneWidget(source)),
  };

  return applyWidgetPatchToDocument(snapshot, patch);
}
