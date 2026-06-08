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
  initializeWidgetPatchHistory,
  parseWidgetPathKey,
  ROOT_WIDGET_PATH,
  selectWidgetPathWithOptions,
  widgetPathKey,
  type WidgetPatchHistory,
  type WidgetPathSelectOptions,
  type WidgetSelectionState,
} from '@workbench-kit/json-widget';

export interface UseJsonWidgetEditorSyncOptions {
  baselineValue?: string | undefined;
  resetKey?: string | undefined;
  value: string;
}

export interface JsonWidgetHistoryActions {
  canRedo: boolean;
  canUndo: boolean;
  redo: () => string | null;
  undo: () => string | null;
}

export interface UseJsonWidgetEditorSyncResult extends JsonWidgetHistoryActions {
  applyPatch: (patch: WidgetPatch) => string | null;
  commitDocument: (next: string) => string;
  dirty: boolean;
  handleEditorMount: OnMount;
  parseError: string | null;
  resetHistory: (document: string) => void;
  root: ReturnType<typeof createJsonWidgetEditorSyncSnapshot>['root'];
  selectedPath: WidgetPath | null;
  selectedWidget: ReturnType<typeof createJsonWidgetEditorSyncSnapshot>['selectedWidget'];
  selection: WidgetSelectionState;
  selectPath: (path: WidgetPath, options?: WidgetPathSelectOptions) => void;
  clearSelection: () => void;
  replaceSelectedWidget: (next: GenericWidget) => string | null;
}

export function useJsonWidgetEditorSync({
  baselineValue,
  resetKey,
  value,
}: UseJsonWidgetEditorSyncOptions): UseJsonWidgetEditorSyncResult {
  const [selection, setSelection] = useState<WidgetSelectionState>(emptyWidgetSelection());
  const [historyVersion, setHistoryVersion] = useState(0);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const isSyncingRef = useRef(false);
  const cursorListenerRef = useRef<{ dispose: () => void } | null>(null);
  const valueRef = useRef(value);
  const historyRef = useRef<WidgetPatchHistory>(initializeWidgetPatchHistory(value));
  const skipHistorySyncRef = useRef(false);

  const bumpHistory = useCallback(() => {
    setHistoryVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    historyRef.current.reset(valueRef.current);
    skipHistorySyncRef.current = true;
    bumpHistory();
    setSelection(emptyWidgetSelection());
  }, [bumpHistory, resetKey]);

  useEffect(() => {
    if (skipHistorySyncRef.current) {
      skipHistorySyncRef.current = false;
      return;
    }
    if (value !== historyRef.current.state.present) {
      historyRef.current.applyDocument(value);
      bumpHistory();
    }
  }, [bumpHistory, value]);

  const snapshot = useMemo(
    () =>
      createJsonWidgetEditorSyncSnapshot({
        document: value,
        baseline: baselineValue,
        selection,
      }),
    [baselineValue, selection, value],
  );

  const selectPath = useCallback((path: WidgetPath, options?: WidgetPathSelectOptions) => {
    setSelection((current) => selectWidgetPathWithOptions(current, path, options));
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(emptyWidgetSelection());
  }, []);

  const applyPatch = useCallback(
    (patch: WidgetPatch) => {
      const nextDocument = applyWidgetPatchToDocument(snapshot, patch);
      if (!nextDocument) return null;
      historyRef.current.applyDocument(nextDocument);
      bumpHistory();
      return nextDocument;
    },
    [bumpHistory, snapshot],
  );

  const commitDocument = useCallback(
    (next: string) => {
      const committed = historyRef.current.applyDocument(next);
      bumpHistory();
      return committed;
    },
    [bumpHistory],
  );

  const replaceSelectedWidget = useCallback(
    (next: GenericWidget) => {
      const path = snapshot.selectedPath ?? ROOT_WIDGET_PATH;
      return applyPatch({
        type: 'replace-widget',
        path,
        widget: next,
      });
    },
    [applyPatch, snapshot.selectedPath],
  );

  const undo = useCallback(() => {
    const next = historyRef.current.undo();
    if (next === null) return null;
    skipHistorySyncRef.current = true;
    bumpHistory();
    return next;
  }, [bumpHistory]);

  const redo = useCallback(() => {
    const next = historyRef.current.redo();
    if (next === null) return null;
    skipHistorySyncRef.current = true;
    bumpHistory();
    return next;
  }, [bumpHistory]);

  const resetHistory = useCallback(
    (document: string) => {
      historyRef.current.reset(document);
      skipHistorySyncRef.current = true;
      bumpHistory();
    },
    [bumpHistory],
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
        return selectWidgetPathWithOptions(emptyWidgetSelection(), path);
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

  const history = historyRef.current;
  void historyVersion;

  return {
    applyPatch,
    canRedo: history.canRedo,
    canUndo: history.canUndo,
    commitDocument,
    dirty: snapshot.dirty,
    handleEditorMount,
    parseError: snapshot.parseError,
    redo,
    resetHistory,
    root: snapshot.root,
    selectedPath: snapshot.selectedPath,
    selectedWidget: snapshot.selectedWidget,
    selection: snapshot.selection,
    clearSelection,
    selectPath,
    replaceSelectedWidget,
    undo,
  };
}

export function formatWidgetDocument(value: Parameters<typeof formatWidgetJson>[0]): string {
  return formatWidgetJson(value);
}
