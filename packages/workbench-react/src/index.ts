export const WORKBENCH_KIT_WORKBENCH_REACT_VERSION = '0.0.0' as const;

export {
  WorkbenchProvider,
  useWorkbench,
  type WorkbenchContextValue,
  type WorkbenchWorkspaceHostPort,
} from './provider.js';
export { EditorArea, type EditorAreaProps } from './editor-area.js';
export { WorkbenchShell, type WorkbenchShellProps } from './shell.js';
export {
  useActiveEditorTab,
  useEditorHost,
  useEditorService,
  useEditorState,
} from './use-editor.js';
