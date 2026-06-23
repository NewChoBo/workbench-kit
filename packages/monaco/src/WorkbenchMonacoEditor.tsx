import { useCallback, type ReactNode } from 'react';
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
  loading = <div className="workspace-editor__loading">Loading editor...</div>,
  onChange,
  onMount,
  options,
  path,
  readOnly = false,
  theme = 'dark',
  value = '',
}: WorkbenchMonacoEditorProps) {
  const handleBeforeMount = useCallback(
    (monacoInstance: WorkbenchMonaco) => {
      prepareMonacoWorkbenchEditor(monacoInstance, theme);
      beforeMount?.(monacoInstance);
    },
    [beforeMount, theme],
  );

  return (
    <div className={className}>
      <Editor
        beforeMount={handleBeforeMount}
        height={height}
        language={language}
        loading={loading}
        options={{
          ...defaultEditorOptions,
          ...options,
          readOnly,
        }}
        path={path}
        theme={monacoThemeForWorkspaceTheme(theme)}
        value={value}
        onChange={(nextValue) => onChange?.(nextValue ?? '')}
        onMount={onMount}
      />
    </div>
  );
}
