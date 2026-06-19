export const WORKBENCH_KIT_WORKBENCH_REACT_VERSION = '0.0.0' as const;

export {
  WorkbenchProvider,
  useWorkbench,
  type WorkbenchContextValue,
  type WorkbenchWorkspaceHostPort,
} from './provider.js';
export {
  DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  isWorkbenchKeybindingPersistenceAvailable,
  readPersistedKeybindingOverrides,
  writePersistedKeybindingOverrides,
} from './keybinding-overrides-storage.js';
export {
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  isWorkbenchLayoutPersistenceAvailable,
  readPersistedWorkbenchLayout,
  resolvePersistedWorkbenchLayout,
  writePersistedWorkbenchLayout,
} from './workbench-layout-storage.js';
export { EditorArea, type EditorAreaProps, type EditorViewMode } from './editor-area.js';
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
export { WorkbenchShell, type WorkbenchShellProps, type WorkbenchThemeOption } from './shell.js';
export {
  getWorkbenchCommandPaletteShortcutLabel,
  WorkbenchCommandHost,
  type WorkbenchCommandHostProps,
} from './workbench-command-host.js';
export {
  WorkbenchStartupGate,
  type WorkbenchStartupGateProps,
} from './workbench-startup-gate.js';
export {
  normalizeKeybindingKeyFromEvent,
  resolveExtensionKeybindingCommand,
} from './workbench-keybinding-bridge.js';
export {
  WORKBENCH_COMMAND_PALETTE_SHORTCUT,
  buildWorkbenchPaletteCommands,
  matchesWorkbenchCommandPaletteShortcut,
  mergeWorkbenchCommandDescriptors,
  resolveShellCommandActivities,
} from './workbench-command-palette.js';
export {
  executeWorkbenchUserCommandAction,
  registerWorkbenchUserCommands,
} from './workbench-user-commands.js';
export {
  useActiveEditorTab,
  useEditorHost,
  useEditorService,
  useEditorState,
} from './use-editor.js';
export {
  MANAGE_ACCOUNTS_COMMAND_ID,
  MANAGE_COMMANDS_COMMAND_ID,
  MANAGE_KEYBINDINGS_COMMAND_ID,
  WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID,
  WORKBENCH_COMMANDS_SETTINGS_CATEGORY_ID,
  WORKBENCH_KEYBINDINGS_SETTINGS_CATEGORY_ID,
  WorkbenchAccountManagementSettings,
  WorkbenchCommandManagementSettings,
  WorkbenchKeybindingManagementSettings,
  createWorkbenchManagementPaletteCommands,
  type WorkbenchAccountManagementInput,
} from './management-settings.js';
