import type {
  GenericWidget,
  WidgetPatch,
  WidgetPath,
  WidgetPathSegment,
} from '@workbench-kit/json-widget';
import {
  applyWidgetPatchToDocument,
  createJsonWidgetEditorSyncSnapshot,
  emptyWidgetSelection,
  getWidgetAtPath,
  ROOT_WIDGET_PATH,
  widgetPathKey,
} from '@workbench-kit/json-widget';

function cloneWidget(widget: GenericWidget): GenericWidget {
  return JSON.parse(JSON.stringify(widget)) as GenericWidget;
}

function stripWidgetId(widget: GenericWidget): GenericWidget {
  const { id: _id, ...rest } = widget;
  return rest;
}

function pathSegmentEquals(a: WidgetPathSegment, b: WidgetPathSegment): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'children' && b.kind === 'children') {
    return a.index === b.index;
  }
  return true;
}

function isAncestorPath(ancestor: WidgetPath, descendant: WidgetPath): boolean {
  if (descendant.length <= ancestor.length) return false;
  for (let index = 0; index < ancestor.length; index += 1) {
    const left = ancestor[index];
    const right = descendant[index];
    if (!left || !right || !pathSegmentEquals(left, right)) {
      return false;
    }
  }
  return true;
}

function comparePathsForDelete(a: WidgetPath, b: WidgetPath): number {
  if (b.length !== a.length) {
    return b.length - a.length;
  }
  const aLast = a[a.length - 1];
  const bLast = b[b.length - 1];
  if (aLast?.kind === 'children' && bLast?.kind === 'children') {
    return bLast.index - aLast.index;
  }
  return widgetPathKey(b).localeCompare(widgetPathKey(a));
}

export function normalizePlaygroundSelectionPaths(paths: readonly WidgetPath[]): WidgetPath[] {
  const editable = paths.filter((path) => path.length > 0);
  const withoutDescendants = editable.filter(
    (path, index) =>
      !editable.some((other, otherIndex) => otherIndex !== index && isAncestorPath(other, path)),
  );
  return [...withoutDescendants].sort(comparePathsForDelete);
}

function removePlaygroundWidgetAtPath(document: string, path: WidgetPath): string | null {
  const snapshot = createJsonWidgetEditorSyncSnapshot({
    document,
    selection: emptyWidgetSelection(),
  });
  if (!snapshot.root) return null;

  const patch: WidgetPatch = {
    type: 'remove-widget',
    path,
  };

  return applyWidgetPatchToDocument(snapshot, patch);
}

export function deletePlaygroundWidgets(
  document: string,
  selectedPaths: readonly WidgetPath[],
): string | null {
  const paths = normalizePlaygroundSelectionPaths(selectedPaths);
  if (paths.length === 0) {
    return null;
  }

  let current = document;
  for (const path of paths) {
    const next = removePlaygroundWidgetAtPath(current, path);
    if (!next) return null;
    current = next;
  }
  return current;
}

export function deletePlaygroundWidget(
  document: string,
  selectedPath: WidgetPath | null,
): string | null {
  if (selectedPath === null || selectedPath.length === 0) {
    return null;
  }
  return deletePlaygroundWidgets(document, [selectedPath]);
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

export function duplicatePlaygroundWidgets(
  document: string,
  selectedPaths: readonly WidgetPath[],
): string | null {
  const paths = normalizePlaygroundSelectionPaths(selectedPaths);
  if (paths.length === 0) {
    return null;
  }

  let current = document;
  for (const path of [...paths].reverse()) {
    const next = duplicatePlaygroundWidget(current, path);
    if (!next) return null;
    current = next;
  }
  return current;
}
