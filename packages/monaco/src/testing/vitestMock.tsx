import { createElement, type ChangeEvent } from 'react';

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

export function WorkbenchMonacoDiffEditor({
  language,
  modified,
  onModifiedChange,
  original,
  readOnly = false,
  theme = 'dark',
}: MockWorkbenchMonacoDiffEditorProps) {
  return createElement(
    'div',
    {
      'data-language': language,
      'data-readonly': readOnly ? 'true' : 'false',
      'data-theme': monacoThemeForWorkspaceTheme(theme),
      'data-testid': 'monaco-diff-editor',
    },
    createElement('textarea', {
      'data-side': 'original',
      readOnly: true,
      value: original ?? '',
    }),
    createElement('textarea', {
      'data-side': 'modified',
      readOnly,
      value: modified ?? '',
      onChange: (event: ChangeEvent<HTMLTextAreaElement>) =>
        onModifiedChange?.(event.currentTarget.value),
    }),
  );
}

export const useMonacoWorkbenchThemeSync = () => undefined;
export const prepareMonacoWorkbenchEditor = () => undefined;
export const defineMonacoWorkbenchTheme = () => undefined;
export const defineOrUpdateWorkbenchMonacoTheme = () => undefined;
export const setWorkbenchMonacoTokenRules = () => undefined;
export const getWorkbenchMonacoTokenRules = () => undefined;
export const buildDefaultMonacoTokenRules = () => [];
export const monacoRulesFromTokenColors = () => [];
export const mergeMonacoTokenRules = (...groups: unknown[]) => groups.flat();
export const toMonacoTokenColor = (color: string) => color;
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
export const DiffEditor = WorkbenchMonacoDiffEditor;
export const loader = { config: () => undefined };
