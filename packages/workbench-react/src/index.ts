export const WORKBENCH_KIT_WORKBENCH_REACT_VERSION = '0.0.0' as const;

export {
  WorkbenchProvider,
  useWorkbench,
  type WorkbenchContextValue,
  type WorkbenchWorkspaceHostPort,
} from './provider.js';
export { EditorArea, type EditorAreaProps } from './editor-area.js';
export {
  DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS,
  JDW_PREVIEW_PROVIDER_ID,
  JSON_FORM_PROVIDER_ID,
  resolveEditorDocumentViewProvider,
  resolveEditorDocumentViews,
  type EditorDocumentContext,
  type EditorDocumentViewKind,
  type EditorDocumentViewProvider,
  type EditorDocumentViewRenderContext,
  type ResolvedEditorDocumentViews,
} from './editor-view-providers.js';
export { WorkbenchShell, type WorkbenchShellProps } from './shell.js';
export {
  useActiveEditorTab,
  useEditorHost,
  useEditorService,
  useEditorState,
} from './use-editor.js';
