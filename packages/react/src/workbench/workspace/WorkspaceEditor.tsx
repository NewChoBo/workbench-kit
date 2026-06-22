import Editor, { loader, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useCallback } from 'react';
import { Panel, PanelBody, PanelHeader } from '../../layout/Panel';
import { Badge } from '../../primitives/Badge';
import { IconButton } from '../../primitives/IconButton';
import { Toolbar } from '../../primitives/Toolbar';
import { extensionOfPath } from './path';
import { WorkspacePathLabel } from './WorkspacePathLabel';
import { WorkspaceFileIcon } from './WorkspaceFileIcon';
import type { WorkspaceFile } from './types';
import { JDW_WIDGET_DOCUMENT_MIME } from '../../jdw/document';
import {
  configureWorkspaceEditorJsonDiagnostics,
  monacoModelPathForWorkspaceFile,
} from './workspaceJsonDiagnostics';
import { configureWorkspaceEditorTypeScriptDiagnostics } from './workspaceTypeScriptDiagnostics';
import {
  defineMonacoWorkbenchTheme,
  MONACO_DARK_THEME_ID,
  MONACO_LIGHT_THEME_ID,
  monacoThemeForWorkspaceTheme,
} from './monacoWorkbenchTheme';
import { useMonacoWorkbenchThemeSync } from './useMonacoWorkbenchThemeSync';

loader.config({ monaco });

export type WorkspaceEditorTheme = 'dark' | 'light';

export {
  MONACO_DARK_THEME_ID,
  MONACO_LIGHT_THEME_ID,
  defineMonacoWorkbenchTheme,
  monacoThemeForWorkspaceTheme,
};

export function prepareMonacoWorkbenchEditor(
  monacoInstance: typeof monaco,
  resolvedTheme: WorkspaceEditorTheme = 'dark',
) {
  defineMonacoWorkbenchTheme(monacoInstance, resolvedTheme);
  configureWorkspaceEditorTypeScriptDiagnostics(monacoInstance);
}

export function languageForFile(path: string, mimeType?: string) {
  switch (mimeType) {
    case 'application/javascript':
    case 'text/javascript':
      return 'javascript';
    case 'application/json':
    case JDW_WIDGET_DOCUMENT_MIME:
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
  showFileBar?: boolean;
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
  showFileBar = true,
  showHeader = true,
  theme = 'dark',
  value = file.content,
}: WorkspaceEditorProps) {
  const language = languageForFile(file.path, file.mimeType);
  useMonacoWorkbenchThemeSync(theme);
  const handleBeforeMount = useCallback(
    (monacoInstance: typeof monaco) => {
      prepareMonacoWorkbenchEditor(monacoInstance, theme);
    },
    [theme],
  );
  const handleMount: OnMount = (editor, monacoInstance) => {
    configureWorkspaceEditorJsonDiagnostics(monacoInstance, file);
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
            <WorkspacePathLabel path={file.path} />
          </span>
        </PanelHeader>
      ) : showFileBar ? (
        <div className="workspace-editor__file-bar" title={file.path}>
          <WorkspaceFileIcon mimeType={file.mimeType} path={file.path} />
          <WorkspacePathLabel className="workspace-editor__file-path" path={file.path} />
          <span className="workspace-editor__file-meta">{file.mimeType ?? language}</span>
        </div>
      ) : null}
      <PanelBody className="workbench-monaco-panel__body">
        <div className="workspace-editor__monaco">
          <Editor
            beforeMount={handleBeforeMount}
            height="100%"
            language={language}
            loading={<div className="workspace-editor__loading">Loading editor...</div>}
            options={{
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
            path={monacoModelPathForWorkspaceFile(file.path)}
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
