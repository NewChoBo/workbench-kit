export type { OnMount } from '@monaco-editor/react';
export type { IDisposable, editor } from 'monaco-editor';
export type { WorkbenchMonaco } from './monaco-loader.js';

export { Editor, loader, monaco } from './monaco-loader.js';
export {
  MONACO_DARK_THEME_ID,
  MONACO_LIGHT_THEME_ID,
  buildMonacoThemeColors,
  defineMonacoWorkbenchTheme,
  getWorkbenchThemeAppearanceSignature,
  monacoThemeForWorkspaceTheme,
  readWorkbenchThemeColors,
  resolveMonacoThemeRoot,
  withAlpha,
  type MonacoWorkbenchResolvedTheme,
  type WorkbenchThemeCssColors,
} from './monacoWorkbenchTheme.js';
export { useMonacoWorkbenchThemeSync } from './useMonacoWorkbenchThemeSync.js';
export { configureWorkspaceEditorTypeScriptDiagnostics } from './workspaceTypeScriptDiagnostics.js';
export {
  WorkbenchMonacoEditor,
  prepareMonacoWorkbenchEditor,
  type WorkbenchMonacoEditorProps,
  type WorkbenchMonacoEditorTheme,
} from './WorkbenchMonacoEditor.js';
