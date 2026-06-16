export const WORKBENCH_KIT_WORKBENCH_REACT_VERSION = '0.0.0' as const;

export { WorkbenchProvider, useWorkbench, type WorkbenchContextValue } from './provider.js';
export { WorkbenchShell, type WorkbenchShellProps } from './shell.js';
export {
  useActiveEditorTab,
  useEditorHost,
  useEditorService,
  useEditorState,
} from './use-editor.js';
