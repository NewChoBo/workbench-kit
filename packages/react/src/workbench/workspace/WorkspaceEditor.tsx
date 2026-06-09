import Editor, { loader, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Panel, PanelBody, PanelHeader } from '../../layout/Panel';
import { Badge } from '../../primitives/Badge';
import { IconButton } from '../../primitives/IconButton';
import { Toolbar } from '../../primitives/Toolbar';
import { extensionOfPath } from './path';
import { WorkspaceFileIcon } from './WorkspaceFileIcon';
import type { WorkspaceFile } from './types';

loader.config({ monaco });

export type WorkspaceEditorTheme = 'dark' | 'light';

export const MONACO_DARK_THEME_ID = 'newchobo-workbench-dark';
export const MONACO_LIGHT_THEME_ID = 'newchobo-workbench-light';
let monacoThemeDefined = false;

export function defineMonacoWorkbenchTheme(monacoInstance: typeof monaco) {
  if (monacoThemeDefined) return;

  monacoInstance.editor.defineTheme(MONACO_DARK_THEME_ID, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#e6edf3',
      'editorGutter.background': '#0d1117',
      'editorLineNumber.foreground': '#484f58',
      'editorLineNumber.activeForeground': '#7d8590',
      'editorCursor.foreground': '#e6edf3',
      'editor.lineHighlightBackground': '#161b22',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#1f3a53',
      'editorWidget.background': '#161b22',
      'editorWidget.border': '#30363d',
      'editorHoverWidget.background': '#161b22',
      'editorHoverWidget.border': '#30363d',
      'editorSuggestWidget.background': '#161b22',
      'editorSuggestWidget.border': '#30363d',
      focusBorder: '#2f81f7',
      'input.background': '#0d1117',
      'input.border': '#30363d',
      'minimap.background': '#0d1117',
      'scrollbarSlider.background': '#30363d66',
      'scrollbarSlider.hoverBackground': '#484f5888',
      'scrollbarSlider.activeBackground': '#7d8590aa',
      'editorIndentGuide.background1': '#30363d',
      'editorIndentGuide.activeBackground1': '#7d8590',
      'editorWhitespace.foreground': '#30363d',
      'editorBracketMatch.background': '#21262d',
      'editorBracketMatch.border': '#7d8590',
      'editorOverviewRuler.border': '#0d1117',
    },
  });

  monacoInstance.editor.defineTheme(MONACO_LIGHT_THEME_ID, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1f2328',
      'editorGutter.background': '#ffffff',
      'editorLineNumber.foreground': '#9198a1',
      'editorLineNumber.activeForeground': '#656d76',
      'editorCursor.foreground': '#1f2328',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editor.selectionBackground': '#bfdbfe',
      'editor.inactiveSelectionBackground': '#dbeafe',
      'editorWidget.background': '#f6f8fa',
      'editorWidget.border': '#d0d7de',
      'editorHoverWidget.background': '#f6f8fa',
      'editorHoverWidget.border': '#d0d7de',
      'editorSuggestWidget.background': '#f6f8fa',
      'editorSuggestWidget.border': '#d0d7de',
      focusBorder: '#0969da',
      'input.background': '#ffffff',
      'input.border': '#d0d7de',
      'minimap.background': '#ffffff',
      'scrollbarSlider.background': '#d0d7de66',
      'scrollbarSlider.hoverBackground': '#9198a188',
      'scrollbarSlider.activeBackground': '#656d76aa',
      'editorIndentGuide.background1': '#d0d7de',
      'editorIndentGuide.activeBackground1': '#656d76',
      'editorWhitespace.foreground': '#d0d7de',
      'editorBracketMatch.background': '#eaeef2',
      'editorBracketMatch.border': '#656d76',
      'editorOverviewRuler.border': '#ffffff',
    },
  });
  monacoThemeDefined = true;
}

export function monacoThemeForWorkspaceTheme(theme: WorkspaceEditorTheme) {
  return theme === 'light' ? MONACO_LIGHT_THEME_ID : MONACO_DARK_THEME_ID;
}

export function languageForFile(path: string, mimeType?: string) {
  switch (mimeType) {
    case 'application/javascript':
    case 'text/javascript':
      return 'javascript';
    case 'application/json':
    case 'application/vnd.workbench-kit.widget+json':
      return 'json';
    case 'application/typescript':
    case 'text/typescript':
      return 'typescript';
    case 'application/xml':
    case 'text/xml':
      return 'xml';
    case 'text/css':
      return 'css';
    case 'text/html':
      return 'html';
    case 'text/markdown':
      return 'markdown';
    case 'text/x-sql':
      return 'sql';
    case 'text/yaml':
      return 'yaml';
  }

  const extension = extensionOfPath(path);
  switch (extension) {
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'cjs':
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'sql':
      return 'sql';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export interface WorkspaceEditorProps {
  compact?: boolean;
  file: WorkspaceFile;
  onChange?: (content: string) => void;
  onEditorMount?: OnMount;
  onSave?: (content: string) => void;
  readOnly?: boolean;
  showHeader?: boolean;
  theme?: WorkspaceEditorTheme;
  value?: string;
}

export function WorkspaceEditor({
  compact,
  file,
  onChange,
  onEditorMount,
  onSave,
  readOnly = !onChange,
  showHeader = true,
  theme = 'dark',
  value = file.content,
}: WorkspaceEditorProps) {
  const language = languageForFile(file.path, file.mimeType);
  const handleMount: OnMount = (editor, monacoInstance) => {
    onEditorMount?.(editor, monacoInstance);

    if (!onSave) return;

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      onSave(editor.getValue());
    });
  };

  return (
    <Panel className="workbench-monaco-panel" style={{ minWidth: 0, minHeight: compact ? 260 : 0 }}>
      {showHeader ? (
        <PanelHeader
          actions={
            <Toolbar>
              <Badge variant="muted">{language}</Badge>
              {file.source ? <Badge variant="muted">{file.source}</Badge> : null}
              <IconButton icon="codicon-split-horizontal" label="Split editor" />
            </Toolbar>
          }
        >
          <span className="workbench-editor-title">
            <WorkspaceFileIcon mimeType={file.mimeType} path={file.path} />
            {file.path}
          </span>
        </PanelHeader>
      ) : (
        <div className="workspace-editor__file-bar" title={file.path}>
          <WorkspaceFileIcon mimeType={file.mimeType} path={file.path} />
          <span className="workspace-editor__file-path">{file.path}</span>
          <span className="workspace-editor__file-meta">{file.mimeType ?? language}</span>
        </div>
      )}
      <PanelBody className="workbench-monaco-panel__body">
        <div className="workspace-editor__monaco">
          <Editor
            beforeMount={defineMonacoWorkbenchTheme}
            height="100%"
            language={language}
            loading={<div className="workspace-editor__loading">Loading editor...</div>}
            options={{
              automaticLayout: true,
              contextmenu: true,
              fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
              fontSize: 13,
              lineHeight: 20,
              minimap: { enabled: false },
              overviewRulerBorder: false,
              padding: { bottom: 12, top: 12 },
              readOnly,
              renderLineHighlight: 'line',
              scrollBeyondLastLine: false,
              scrollbar: {
                alwaysConsumeMouseWheel: false,
                horizontalScrollbarSize: 10,
                verticalScrollbarSize: 10,
              },
              tabSize: 2,
              wordWrap: 'on',
            }}
            path={file.path}
            theme={monacoThemeForWorkspaceTheme(theme)}
            value={value}
            onChange={(nextValue) => onChange?.(nextValue ?? '')}
            onMount={handleMount}
          />
        </div>
      </PanelBody>
    </Panel>
  );
}
