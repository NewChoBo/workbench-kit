import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

import { Editor } from './monaco-loader.js';
import type { WorkbenchMonaco } from './monaco-loader.js';
import {
  defineMonacoWorkbenchTheme,
  monacoThemeForWorkspaceTheme,
  type MonacoWorkbenchResolvedTheme,
} from './monacoWorkbenchTheme.js';
import { configureWorkspaceEditorTypeScriptDiagnostics } from './workspaceTypeScriptDiagnostics.js';

export type WorkbenchMonacoEditorTheme = MonacoWorkbenchResolvedTheme;

export function prepareMonacoWorkbenchEditor(
  monacoInstance: WorkbenchMonaco,
  resolvedTheme: WorkbenchMonacoEditorTheme = 'dark',
) {
  defineMonacoWorkbenchTheme(monacoInstance, resolvedTheme);
  configureWorkspaceEditorTypeScriptDiagnostics(monacoInstance);
}

export interface WorkbenchMonacoEditorProps {
  beforeMount?: ((monacoInstance: WorkbenchMonaco) => void) | undefined;
  className?: string | undefined;
  height?: number | string | undefined;
  language: string;
  loading?: ReactNode | undefined;
  onChange?: ((value: string) => void) | undefined;
  onMount?: OnMount | undefined;
  options?: Monaco.editor.IStandaloneEditorConstructionOptions | undefined;
  path?: string | undefined;
  readOnly?: boolean | undefined;
  theme?: WorkbenchMonacoEditorTheme | undefined;
  value?: string | undefined;
}

const defaultEditorOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  contextmenu: true,
  fixedOverflowWidgets: true,
  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  fontSize: 13,
  lineHeight: 20,
  glyphMargin: false,
  minimap: { enabled: false },
  overviewRulerBorder: false,
  overviewRulerLanes: 0,
  padding: { bottom: 12, top: 12 },
  renderLineHighlight: 'line',
  scrollBeyondLastLine: false,
  scrollbar: {
    alwaysConsumeMouseWheel: false,
    horizontalScrollbarSize: 10,
    verticalScrollbarSize: 10,
  },
  tabSize: 2,
  wordWrap: 'on',
};

export function WorkbenchMonacoEditor({
  beforeMount,
  className,
  height = '100%',
  language,
  loading = (
    <div className="ui-panel-loading ui-panel-centered-state" role="status" aria-live="polite">
      <i aria-hidden className="codicon codicon-loading codicon-modifier-spin" />
      <span>Loading editor...</span>
    </div>
  ),
  onChange,
  onMount,
  options,
  path,
  readOnly = false,
  theme = 'dark',
  value = '',
}: WorkbenchMonacoEditorProps) {
  const [mounted, setMounted] = useState<{
    editor: Monaco.editor.IStandaloneCodeEditor;
    monaco: WorkbenchMonaco;
  } | null>(null);
  const committed = useRef({ onChange, onMount, value, path, readOnly });
  const applyingValue = useRef<string | undefined>(undefined);
  const reconciled = useRef<{
    model: Monaco.editor.ITextModel;
    value: string;
    path: string | undefined;
  } | null>(null);
  useLayoutEffect(() => {
    committed.current = { onChange, onMount, value, path, readOnly };
  }, [onChange, onMount, value, path, readOnly]);

  const subscribe = useCallback(
    (notify: () => void) => {
      if (!mounted) return () => {};
      const { editor } = mounted;
      const model = editor.onDidChangeModel(notify);
      const disposed = editor.onDidDispose(() => {
        reconciled.current = null;
        setMounted(null);
        notify();
      });
      return () => {
        model.dispose();
        disposed.dispose();
      };
    },
    [mounted],
  );
  const snapshot = useCallback(() => {
    const model = mounted?.editor.getModel();
    return model && !model.isDisposed() ? model : null;
  }, [mounted]);
  const model = useSyncExternalStore(subscribe, snapshot, () => null);

  const reconcile = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monaco: WorkbenchMonaco) => {
      const { value, path, readOnly } = committed.current;
      const model = editor.getModel();
      if (!model || model.isDisposed()) return;
      // The upstream path switch happens later; never write the new value into the old model.
      if (path && model.uri.toString() !== monaco.Uri.parse(path).toString()) return;
      if (!path && reconciled.current?.model === model && reconciled.current.path !== path) return;
      // The upstream options effect is passive too; a newly editable value needs this option now.
      if (editor.getOption(monaco.editor.EditorOption.readOnly) !== readOnly)
        editor.updateOptions({ readOnly });
      if (reconciled.current?.model === model && reconciled.current.value === value) return;
      if (model.getValue() !== value) {
        // Match the upstream callback contract: only editable writes suppress their echo.
        if (readOnly) editor.setValue(value);
        else {
          const previousWrite = applyingValue.current;
          applyingValue.current = value;
          try {
            const applied = editor.executeEdits('', [
              { range: model.getFullModelRange(), text: value, forceMoveMarkers: true },
            ]);
            if (!applied) return;
            editor.pushUndoStop();
          } finally {
            applyingValue.current = previousWrite;
          }
        }
      }
      reconciled.current = { model, value, path };
    },
    [],
  );

  useLayoutEffect(() => {
    if (mounted) reconcile(mounted.editor, mounted.monaco);
  }, [mounted, path, value, model, reconcile]);

  const handleMount = useCallback<OnMount>(
    (editor, monaco) => {
      // Establish the incoming value before handing the editor to its consumer.
      reconcile(editor, monaco);
      let disposed = false;
      const mounting = editor.onDidDispose(() => {
        disposed = true;
      });
      try {
        committed.current.onMount?.(editor, monaco);
      } finally {
        mounting.dispose();
      }
      if (!disposed) setMounted({ editor, monaco });
    },
    [reconcile],
  );
  const handleChange = useCallback((nextValue: string | undefined) => {
    if (applyingValue.current === undefined || nextValue !== applyingValue.current)
      committed.current.onChange?.(nextValue ?? '');
  }, []);

  const handleBeforeMount = useCallback(
    (monacoInstance: WorkbenchMonaco) => {
      prepareMonacoWorkbenchEditor(monacoInstance, theme);
      beforeMount?.(monacoInstance);
    },
    [beforeMount, theme],
  );

  return (
    <Editor
      className={className}
      beforeMount={handleBeforeMount}
      height={height}
      language={language}
      loading={loading}
      options={{
        ...defaultEditorOptions,
        ...options,
        // The native editor exists before the upstream mount/change effects are installed.
        readOnly: mounted ? readOnly : true,
      }}
      path={path}
      theme={monacoThemeForWorkspaceTheme(theme)}
      // Monaco owns live edits. Kit reconciles changed committed values synchronously;
      // the upstream passive value effect must not replay an older render over newer input.
      defaultValue={value}
      value={undefined}
      onChange={handleChange}
      onMount={handleMount}
    />
  );
}
