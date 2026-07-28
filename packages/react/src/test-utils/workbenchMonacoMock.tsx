import type { ReactNode } from 'react';
import { createElement } from 'react';

export interface MockWorkbenchMonacoEditorProps {
  language?: string;
  onChange?: (value?: string) => void;
  path?: string;
  theme?: string;
  value?: string;
}

export interface MockWorkbenchMonacoDiffEditorProps {
  language?: string;
  modified?: string;
  onModifiedChange?: (value: string) => void;
  original?: string;
  readOnly?: boolean;
  theme?: string;
}

export function createWorkbenchMonacoMockModule(
  renderEditor?: (props: MockWorkbenchMonacoEditorProps) => ReactNode,
) {
  const defaultRender = ({ value }: MockWorkbenchMonacoEditorProps) =>
    createElement('div', { 'data-testid': 'monaco-editor' }, value ?? 'Mocked Monaco Editor');

  const defaultDiffRender = ({ modified, original }: MockWorkbenchMonacoDiffEditorProps) =>
    createElement(
      'div',
      { 'data-testid': 'monaco-diff-editor' },
      original ?? '',
      '\n---\n',
      modified ?? '',
    );

  return {
    WorkbenchMonacoEditor: renderEditor ?? defaultRender,
    WorkbenchMonacoDiffEditor: defaultDiffRender,
    DiffEditor: defaultDiffRender,
    useMonacoWorkbenchThemeSync: () => undefined,
    prepareMonacoWorkbenchEditor: () => undefined,
    monacoThemeForWorkspaceTheme: (theme: string) =>
      theme === 'light' ? 'workbench-kit-light' : 'workbench-kit-dark',
    MONACO_DARK_THEME_ID: 'workbench-kit-dark',
    MONACO_LIGHT_THEME_ID: 'workbench-kit-light',
    monaco: {
      KeyMod: { CtrlCmd: 1 },
      KeyCode: { KeyS: 1 },
      editor: {
        defineTheme: () => undefined,
        setTheme: () => undefined,
        onDidChangeMarkers: () => ({ dispose: () => undefined }),
        getModelMarkers: () => [],
      },
    },
  };
}
