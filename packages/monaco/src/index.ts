export type { OnMount } from '@monaco-editor/react';
export type { IDisposable, editor } from 'monaco-editor';
export type { WorkbenchMonaco } from './monaco-loader.js';

export { Editor, loader, monaco } from './monaco-loader.js';
export {
  createMonacoWorker,
  installMonacoEnvironment,
  resolveMonacoWorkerSource,
  type InstallMonacoEnvironmentOptions,
  type MonacoEnvironmentWorkers,
  type MonacoWorkerSource,
} from './installMonacoEnvironment.js';
export {
  MONACO_DARK_THEME_ID,
  MONACO_LIGHT_THEME_ID,
  buildDefaultMonacoTokenRules,
  buildMonacoThemeColors,
  defineMonacoWorkbenchTheme,
  defineOrUpdateWorkbenchMonacoTheme,
  getWorkbenchMonacoTokenRules,
  getWorkbenchThemeAppearanceSignature,
  mergeMonacoTokenRules,
  monacoRulesFromTokenColors,
  monacoThemeForWorkspaceTheme,
  readWorkbenchThemeColors,
  resolveMonacoThemeRoot,
  setWorkbenchMonacoTokenRules,
  toMonacoTokenColor,
  withAlpha,
  buildWorkbenchMonacoThemeInput,
  type DefineMonacoWorkbenchThemeOptions,
  type MonacoTokenRule,
  type MonacoWorkbenchResolvedTheme,
  type MonacoWorkbenchThemeBase,
  type WorkbenchMonacoThemeInput,
  type WorkbenchThemeCssColors,
  type WorkbenchTokenColorSetting,
} from './monacoWorkbenchTheme.js';
export { useMonacoWorkbenchThemeSync } from './useMonacoWorkbenchThemeSync.js';
export { configureWorkspaceEditorTypeScriptDiagnostics } from './workspaceTypeScriptDiagnostics.js';
export {
  WorkbenchMonacoEditor,
  prepareMonacoWorkbenchEditor,
  type WorkbenchMonacoEditorProps,
  type WorkbenchMonacoEditorTheme,
} from './WorkbenchMonacoEditor.js';
