import { createElement, type ChangeEvent } from 'react';

export interface MockWorkbenchMonacoEditorProps {
  language?: string;
  onChange?: (value?: string) => void;
  path?: string;
  theme?: string;
  value?: string;
}

export function WorkbenchMonacoEditor({
  language,
  onChange,
  path,
  theme = 'dark',
  value,
}: MockWorkbenchMonacoEditorProps) {
  return createElement('textarea', {
    'data-language': language,
    'data-path': path,
    'data-theme': monacoThemeForWorkspaceTheme(theme),
    'data-testid': 'monaco-editor',
    value: value ?? '',
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => onChange?.(event.currentTarget.value),
  });
}

export const useMonacoWorkbenchThemeSync = () => undefined;
export const prepareMonacoWorkbenchEditor = () => undefined;
export const defineMonacoWorkbenchTheme = () => undefined;
export const configureWorkspaceEditorTypeScriptDiagnostics = () => undefined;
export const monacoThemeForWorkspaceTheme = (theme: string) =>
  theme === 'light' ? MONACO_LIGHT_THEME_ID : MONACO_DARK_THEME_ID;
export const MONACO_DARK_THEME_ID = 'workbench-kit-dark';
export const MONACO_LIGHT_THEME_ID = 'workbench-kit-light';
export const buildMonacoThemeColors = () => ({});
export const getWorkbenchThemeAppearanceSignature = () => '';
export const readWorkbenchThemeColors = () => ({});
export const resolveMonacoThemeRoot = () => null;
export const withAlpha = (color: string, _alpha?: number) => color;

export const monaco = {
  KeyMod: { CtrlCmd: 1 },
  KeyCode: { KeyS: 1 },
  editor: {
    defineTheme: () => undefined,
    setTheme: () => undefined,
    onDidChangeMarkers: () => ({ dispose: () => undefined }),
    getModelMarkers: () => [],
  },
};

export const Editor = WorkbenchMonacoEditor;
export const loader = { config: () => undefined };

export function createWorkbenchMonacoMockModule(
  renderEditor?: (props: MockWorkbenchMonacoEditorProps) => ReturnType<typeof createElement>,
) {
  const defaultRender = ({ value }: MockWorkbenchMonacoEditorProps) =>
    createElement('div', { 'data-testid': 'monaco-editor' }, value ?? 'Mocked Monaco Editor');

  return {
    WorkbenchMonacoEditor: renderEditor ?? defaultRender,
    useMonacoWorkbenchThemeSync: () => undefined,
    prepareMonacoWorkbenchEditor: () => undefined,
    monacoThemeForWorkspaceTheme: (theme: string) => theme,
    MONACO_DARK_THEME_ID: 'workbench-kit-dark',
    MONACO_LIGHT_THEME_ID: 'workbench-kit-light',
    monaco,
  };
}
