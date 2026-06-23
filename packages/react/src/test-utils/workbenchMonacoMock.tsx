import type { ReactNode } from 'react';
import { createElement } from 'react';

export interface MockWorkbenchMonacoEditorProps {
  language?: string;
  onChange?: (value?: string) => void;
  path?: string;
  theme?: string;
  value?: string;
}

export function createWorkbenchMonacoMockModule(
  renderEditor?: (props: MockWorkbenchMonacoEditorProps) => ReactNode,
) {
  const defaultRender = ({ value }: MockWorkbenchMonacoEditorProps) =>
    createElement('div', { 'data-testid': 'monaco-editor' }, value ?? 'Mocked Monaco Editor');

  return {
    WorkbenchMonacoEditor: renderEditor ?? defaultRender,
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
