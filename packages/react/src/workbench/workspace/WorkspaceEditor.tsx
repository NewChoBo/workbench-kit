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

const MONACO_THEME_ID = 'newchobo-workbench';
let monacoThemeDefined = false;

function defineMonacoWorkbenchTheme(monacoInstance: typeof monaco) {
  if (monacoThemeDefined) return;

  monacoInstance.editor.defineTheme(MONACO_THEME_ID, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'd4d4d4' },
      { token: 'comment', foreground: '6a9955' },
      { token: 'keyword', foreground: '569cd6' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'type', foreground: '4ec9b0' },
    ],
    colors: {
      'editor.background': '#1f1f24',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2d33',
      'editorLineNumber.activeForeground': '#c6cbd2',
      'editorLineNumber.foreground': '#6f7580',
      'editorWidget.background': '#25272d',
      'minimap.background': '#1f1f24',
    },
  });
  monacoThemeDefined = true;
}

export function languageForFile(path: string, mimeType?: string) {
  const extension = extensionOfPath(path);
  if (mimeType === 'application/json') return 'json';
  if (mimeType === 'text/css') return 'css';
  if (mimeType === 'text/html') return 'html';
  if (mimeType === 'text/markdown') return 'markdown';

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
  onSave?: (content: string) => void;
  readOnly?: boolean;
  showHeader?: boolean;
  value?: string;
}

export function WorkspaceEditor({
  compact,
  file,
  onChange,
  onSave,
  readOnly = !onChange,
  showHeader = true,
  value = file.content,
}: WorkspaceEditorProps) {
  const language = languageForFile(file.path, file.mimeType);
  const handleMount: OnMount = (editor, monacoInstance) => {
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
              <IconButton icon="codicon-split" label="Split editor" />
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
        <Editor
          beforeMount={defineMonacoWorkbenchTheme}
          height="100%"
          language={language}
          loading={<div className="workspace-editor__loading">Loading editor...</div>}
          options={{
            automaticLayout: true,
            contextmenu: true,
            fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
            fontSize: 12,
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
          }}
          path={file.path}
          theme={MONACO_THEME_ID}
          value={value}
          onChange={(nextValue) => onChange?.(nextValue ?? '')}
          onMount={handleMount}
        />
      </PanelBody>
    </Panel>
  );
}
