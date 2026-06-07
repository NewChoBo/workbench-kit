import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WidgetTypeShape } from '@workbench-kit/contracts';
import type { WidgetPath } from '@workbench-kit/json-widget';
import {
  applyWidgetPatchToDocument,
  createJsonWidgetEditorSyncSnapshot,
  emptyWidgetSelection,
  formatWidgetJson,
  ROOT_WIDGET_PATH,
  selectWidgetPath,
  type WidgetSelectionState,
} from '@workbench-kit/json-widget';

export interface UseJsonWidgetEditorSyncOptions {
  baselineValue?: string | undefined;
  resetKey?: string | undefined;
  value: string;
}

export interface UseJsonWidgetEditorSyncResult {
  dirty: boolean;
  parseError: string | null;
  root: ReturnType<typeof createJsonWidgetEditorSyncSnapshot>['root'];
  selectedPath: WidgetPath | null;
  selectedWidget: ReturnType<typeof createJsonWidgetEditorSyncSnapshot>['selectedWidget'];
  selection: WidgetSelectionState;
  selectPath: (path: WidgetPath) => void;
  replaceSelectedWidget: (
    next: Parameters<typeof applyWidgetPatchToDocument>[1]['widget'],
  ) => string | null;
}

export function useJsonWidgetEditorSync({
  baselineValue,
  resetKey,
  value,
}: UseJsonWidgetEditorSyncOptions): UseJsonWidgetEditorSyncResult {
  const [selection, setSelection] = useState<WidgetSelectionState>(emptyWidgetSelection());

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

  const replaceSelectedWidget = useCallback(
    (next: Parameters<typeof applyWidgetPatchToDocument>[1]['widget']) => {
      const path = snapshot.selectedPath ?? ROOT_WIDGET_PATH;
      return applyWidgetPatchToDocument(snapshot, {
        type: 'replace-widget',
        path,
        widget: next,
      });
    },
    [snapshot],
  );

  return {
    dirty: snapshot.dirty,
    parseError: snapshot.parseError,
    root: snapshot.root,
    selectedPath: snapshot.selectedPath,
    selectedWidget: snapshot.selectedWidget,
    selection: snapshot.selection,
    selectPath,
    replaceSelectedWidget,
  };
}

export function formatWidgetDocument(value: WidgetTypeShape & Record<string, unknown>): string {
  return formatWidgetJson(value);
}
