import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OnMount } from '@monaco-editor/react';
import type { GenericWidget, WidgetPath, WidgetPatch } from '@workbench-kit/json-widget';
import {
  applyWidgetPatchToDocument,
  createJsonWidgetEditorSyncSnapshot,
  emptyWidgetSelection,
  findLineAndColumnForPath,
  findPathForLineAndColumn,
  formatWidgetJson,
  parseWidgetPathKey,
  ROOT_WIDGET_PATH,
  selectWidgetPath,
  widgetPathKey,
  type WidgetSelectionState,
} from '@workbench-kit/json-widget';

export interface UseJsonWidgetEditorSyncOptions {
  baselineValue?: string | undefined;
  resetKey?: string | undefined;
  value: string;
}

export interface UseJsonWidgetEditorSyncResult {
  applyPatch: (patch: WidgetPatch) => string | null;
  dirty: boolean;
  handleEditorMount: OnMount;
  parseError: string | null;
  root: ReturnType<typeof createJsonWidgetEditorSyncSnapshot>['root'];
  selectedPath: WidgetPath | null;
  selectedWidget: ReturnType<typeof createJsonWidgetEditorSyncSnapshot>['selectedWidget'];
  selection: WidgetSelectionState;
  selectPath: (path: WidgetPath) => void;
  replaceSelectedWidget: (next: GenericWidget) => string | null;
}

export function useJsonWidgetEditorSync({
  baselineValue,
  resetKey,
  value,
}: UseJsonWidgetEditorSyncOptions): UseJsonWidgetEditorSyncResult {
  const [selection, setSelection] = useState<WidgetSelectionState>(emptyWidgetSelection());
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const isSyncingRef = useRef(false);
  const cursorListenerRef = useRef<{ dispose: () => void } | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    setSelection(emptyWidgetSelection());
  }, [resetKey]);

  const snapshot = useMemo(
    () =>
      createJsonWidgetEditorSyncSnapshot({
        document: value,
        baseline: baselineValue,
        selection,
      }),
    [baselineValue, selection, value],
  );

  const selectPath = useCallback((path: WidgetPath) => {
    setSelection((current) => selectWidgetPath(current, path));
  }, []);

  const applyPatch = useCallback(
    (patch: WidgetPatch) => applyWidgetPatchToDocument(snapshot, patch),
    [snapshot],
  );

  const replaceSelectedWidget = useCallback(
    (next: GenericWidget) => {
      const path = snapshot.selectedPath ?? ROOT_WIDGET_PATH;
      return applyWidgetPatchToDocument(snapshot, {
        type: 'replace-widget',
        path,
        widget: next,
      });
    },
    [snapshot],
  );

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    cursorListenerRef.current?.dispose();

    cursorListenerRef.current = editor.onDidChangeCursorPosition((event) => {
      const path = findPathForLineAndColumn(
        editor.getValue(),
        event.position.lineNumber,
        event.position.column,
      );
      if (!path) return;

      const pathKey = widgetPathKey(path);
      setSelection((prev) => {
        if (prev.pathKeys.has(pathKey)) return prev;
        isSyncingRef.current = true;
        return selectWidgetPath(emptyWidgetSelection(), path);
      });
    });
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    if (selection.pathKeys.size === 0) return;

    const key = Array.from(selection.pathKeys)[0];
    if (!key) return;

    const path = parseWidgetPathKey(key);
    const pos = findLineAndColumnForPath(valueRef.current, path);
    if (pos.line === 1 && pos.column === 1 && path.length > 0) return;

    const current = editor.getPosition();
    if (current && current.lineNumber === pos.line && current.column === pos.column) return;

    editor.setPosition({ lineNumber: pos.line, column: pos.column });
    editor.revealLineInCenterIfOutsideViewport(pos.line);
  }, [selection]);

  useEffect(
    () => () => {
      cursorListenerRef.current?.dispose();
      cursorListenerRef.current = null;
    },
    [],
  );

  return {
    applyPatch,
    dirty: snapshot.dirty,
    handleEditorMount,
    parseError: snapshot.parseError,
    root: snapshot.root,
    selectedPath: snapshot.selectedPath,
    selectedWidget: snapshot.selectedWidget,
    selection: snapshot.selection,
    selectPath,
    replaceSelectedWidget,
  };
}

export function formatWidgetDocument(value: Parameters<typeof formatWidgetJson>[0]): string {
  return formatWidgetJson(value);
}
