import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { DiffOnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

import { DiffEditor } from './monaco-loader.js';
import type { WorkbenchMonaco } from './monaco-loader.js';
import { monacoThemeForWorkspaceTheme } from './monacoWorkbenchTheme.js';
import {
  prepareMonacoWorkbenchEditor,
  type WorkbenchMonacoEditorTheme,
} from './WorkbenchMonacoEditor.js';

export interface WorkbenchMonacoDiffEditorProps {
  beforeMount?: ((monacoInstance: WorkbenchMonaco) => void) | undefined;
  className?: string | undefined;
  height?: number | string | undefined;
  language?: string | undefined;
  loading?: ReactNode | undefined;
  modified: string;
  modifiedModelPath?: string | undefined;
  onModifiedChange?: ((value: string) => void) | undefined;
  onMount?: DiffOnMount | undefined;
  options?: Monaco.editor.IDiffEditorConstructionOptions | undefined;
  original: string;
  originalModelPath?: string | undefined;
  readOnly?: boolean | undefined;
  theme?: WorkbenchMonacoEditorTheme | undefined;
}

const defaultDiffEditorOptions: Monaco.editor.IDiffEditorConstructionOptions = {
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
  wordWrap: 'on',
};

export function WorkbenchMonacoDiffEditor({
  beforeMount,
  className,
  height = '100%',
  language = 'plaintext',
  loading = (
    <div className="ui-panel-loading ui-panel-centered-state" role="status" aria-live="polite">
      <i aria-hidden className="codicon codicon-loading codicon-modifier-spin" />
      <span>Loading diff editor...</span>
    </div>
  ),
  modified,
  modifiedModelPath,
  onModifiedChange,
  onMount,
  options,
  original,
  originalModelPath,
  readOnly = false,
  theme = 'dark',
}: WorkbenchMonacoDiffEditorProps) {
  const modifiedChangeDisposableRef = useRef<Monaco.IDisposable | null>(null);

  useEffect(() => {
    return () => {
      modifiedChangeDisposableRef.current?.dispose();
      modifiedChangeDisposableRef.current = null;
    };
  }, []);

  const handleBeforeMount = useCallback(
    (monacoInstance: WorkbenchMonaco) => {
      prepareMonacoWorkbenchEditor(monacoInstance, theme);
      beforeMount?.(monacoInstance);
    },
    [beforeMount, theme],
  );

  const handleMount = useCallback<DiffOnMount>(
    (diffEditor, monacoInstance) => {
      modifiedChangeDisposableRef.current?.dispose();
      modifiedChangeDisposableRef.current = null;

      if (onModifiedChange && !readOnly) {
        const modifiedEditor = diffEditor.getModifiedEditor();
        modifiedChangeDisposableRef.current = modifiedEditor.onDidChangeModelContent(() => {
          onModifiedChange(modifiedEditor.getValue());
        });
      }

      onMount?.(diffEditor, monacoInstance);
    },
    [onModifiedChange, onMount, readOnly],
  );

  return (
    <DiffEditor
      className={className}
      beforeMount={handleBeforeMount}
      height={height}
      language={language}
      loading={loading}
      modified={modified}
      modifiedModelPath={modifiedModelPath}
      options={{
        ...defaultDiffEditorOptions,
        ...options,
        originalEditable: options?.originalEditable ?? false,
        readOnly,
      }}
      original={original}
      originalModelPath={originalModelPath}
      theme={monacoThemeForWorkspaceTheme(theme)}
      onMount={handleMount}
    />
  );
}
