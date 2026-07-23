export const WORKBENCH_KIT_WORKBENCH_REACT_VERSION = '0.0.0' as const;

export {
  WorkbenchProvider,
  useWorkbench,
  type WorkbenchContextValue,
  type WorkbenchStorageAdapter,
  type WorkbenchWorkspaceHostPort,
} from './shell/provider.js';
export {
  WorkbenchDevtoolsPanel,
  WorkbenchDevtoolsShell,
  useWorkbenchDevtoolsSnapshot,
  type WorkbenchDevtoolsShellProps,
  type WorkbenchDevtoolsSnapshot,
} from './devtools/index.js';
export {
  DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  isWorkbenchEditorStatePersistenceAvailable,
  readPersistedEditorState,
  writePersistedEditorState,
} from './editor/state-storage.js';
export {
  DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  isWorkbenchKeybindingPersistenceAvailable,
  readPersistedKeybindingOverrides,
  writePersistedKeybindingOverrides,
} from './management/keybinding-overrides-storage.js';
export {
  DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  isWorkbenchLocalPreferencePersistenceAvailable,
  readPersistedLocalPreferences,
  writePersistedLocalPreferences,
} from './management/preference-settings-storage.js';
export {
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  isWorkbenchLayoutPersistenceAvailable,
  readPersistedWorkbenchLayout,
  resolvePersistedWorkbenchLayout,
  writePersistedWorkbenchLayout,
} from './workbench/layout-storage.js';
export {
  DEFAULT_WORKBENCH_APPEARANCE,
  DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  isWorkbenchAppearancePersistenceAvailable,
  readPersistedWorkbenchAppearance,
  writePersistedWorkbenchAppearance,
  type WorkbenchAppearanceSettings,
} from './workbench/appearance-storage.js';
export {
  usePersistedWorkbenchAppearance,
  type UsePersistedWorkbenchAppearanceOptions,
} from './workbench/use-persisted-appearance.js';
export {
  createWorkspaceResourceStatusItems,
  mergeWorkbenchStatusSections,
  type WorkspaceResourceStatusItemsInput,
} from './workbench/status-sections.js';
export { EditorArea, type EditorAreaProps, type EditorViewMode } from './editor/area.js';
export {
  DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS,
  EditorDocumentViewProviderRegistry,
  JDW_PREVIEW_PROVIDER_ID,
  JDW_WIDGET_FORM_PROVIDER_ID,
  JSON_FORM_PROVIDER,
  JSON_FORM_PROVIDER_ID,
  createEditorDocumentViewProviderRegistry,
  resolveEditorDocumentViewProvider,
  resolveEditorDocumentViews,
  type CreateEditorDocumentViewProviderRegistryOptions,
  type EditorDocumentContext,
  type EditorDocumentViewKind,
  type EditorDocumentViewProvider,
  type EditorDocumentViewRenderContext,
  type ResolvedEditorDocumentViews,
} from './editor/view-providers.js';
export { SampleJdwLabView, type SampleJdwLabViewProps } from './jdw/lab-view.js';
export { JdwWidgetFormView, type JdwWidgetFormViewProps } from './jdw/widget-form-view.js';
export { JdwWidgetPreviewView, type JdwWidgetPreviewViewProps } from './jdw/widget-preview-view.js';
export {
  isSampleJdwLabViewRenderData,
  SAMPLE_JDW_LAB_VIEW_RENDER_KIND,
  type SampleJdwLabViewRenderData,
} from './jdw/lab-view-data.js';
export { SampleFieldRemapDemo, type SampleFieldRemapDemoProps } from './field-remap/demo.js';
export { FieldRemapPanel, type FieldRemapPanelProps } from './field-remap/panel.js';
export { FieldRemapFlowMapper, type FieldRemapFlowMapperProps } from './field-remap/flow.js';
export {
  FIELD_REMAP_SAMPLES,
  getFieldRemapSample,
  isFieldRemapSampleId,
  resolveFieldRemapSampleId,
  type FieldRemapSampleDefinition,
  type FieldRemapSampleId,
} from './field-remap/samples.js';
export {
  SampleFieldRemapView,
  buildFieldRemapEditorUri,
  parseFieldRemapEditorSampleId,
  type SampleFieldRemapViewProps,
} from './field-remap/view.js';
export {
  isSampleFieldRemapViewRenderData,
  SAMPLE_FIELD_REMAP_VIEW_RENDER_KIND,
  type SampleFieldRemapViewRenderData,
} from './field-remap/view-data.js';
export {
  FieldRemapEditorSurface,
  type FieldRemapEditorSurfaceId,
  type FieldRemapEditorSurfaceProps,
} from './field-remap/editor-surface.js';
export {
  WorkbenchShell,
  type WorkbenchLocaleOption,
  type WorkbenchShellProps,
  type WorkbenchThemeOption,
} from './shell/shell.js';
export {
  getWorkbenchCommandPaletteShortcutLabel,
  getWorkbenchQuickAccessShortcutLabel,
  WORKBENCH_COMMAND_PALETTE_SHORTCUT,
  WORKBENCH_QUICK_ACCESS_SHORTCUT,
  buildWorkbenchPaletteCommands,
  matchesWorkbenchCommandPaletteShortcut,
  matchesWorkbenchQuickAccessShortcut,
  mergeWorkbenchCommandDescriptors,
  resolveShellCommandActivities,
} from './workbench/command-palette.js';
export { WorkbenchCommandHost, type WorkbenchCommandHostProps } from './workbench/command-host.js';
export { WorkbenchStartupGate, type WorkbenchStartupGateProps } from './workbench/startup-gate.js';
export {
  normalizeKeybindingKeyFromEvent,
  resolveExtensionKeybindingCommand,
} from './workbench/keybinding-bridge.js';
export {
  parseWorkbenchChatCommandInput,
  type WorkbenchChatCommandInputParseResult,
} from './chat/command-input.js';
export {
  useWorkbenchChatCommandSurface,
  type WorkbenchChatCommandRunResult,
  type WorkbenchChatCommandSurfaceOptions,
} from './chat/command-surface.js';
export { useWorkbenchCommandDescriptors } from './commands/use-command-descriptors.js';
export {
  executeWorkbenchUserCommandAction,
  registerWorkbenchUserCommands,
} from './workbench/user-commands.js';
export {
  createWorkbenchHostThemeRegistration,
  HOST_WORKBENCH_THEME_EXTENSION_ID,
  registerHostWorkbenchThemes,
  registerWorkbenchTheme,
  REQUIRED_THEME_TOKEN_KEYS,
  type RegisterWorkbenchThemeOptions,
  type WorkbenchHostThemeMode,
  type WorkbenchHostThemeRegistration,
} from '@workbench-kit/workbench-core';
export {
  useActiveEditorTab,
  useEditorDocumentViewProviders,
  useEditorHost,
  useEditorService,
  useEditorState,
} from './editor/use-editor.js';
export {
  isWorkspaceResourceService,
  useWorkspaceResourceState,
} from './workbench/workspace-view-state.js';
export {
  MANAGE_ACCOUNTS_COMMAND_ID,
  MANAGE_COMMANDS_COMMAND_ID,
  MANAGE_EXTENSIONS_COMMAND_ID,
  MANAGE_KEYBINDINGS_COMMAND_ID,
  WORKBENCH_ACCOUNTS_SETTINGS_CATEGORY_ID,
  WORKBENCH_COMMANDS_SETTINGS_CATEGORY_ID,
  WORKBENCH_EXTENSIONS_SETTINGS_CATEGORY_ID,
  WORKBENCH_KEYBINDINGS_SETTINGS_CATEGORY_ID,
} from './management/settings-ids.js';
export { createWorkbenchManagementPaletteCommands } from './management/palette-commands.js';
export {
  WorkbenchAccountManagementSettings,
  WorkbenchCommandManagementSettings,
  WorkbenchExtensionManagementSettings,
  WorkbenchKeybindingManagementSettings,
  type WorkbenchAccountManagementInput,
} from './management/settings.js';
export {
  WORKBENCH_PROFILE_ACTIVITY_ITEM_ID,
  WORKBENCH_ACCOUNT_ACTIVITY_ITEM_ID,
  WORKBENCH_SETTINGS_ACTIVITY_ITEM_ID,
  createWorkbenchSecondaryActivityItems,
  getWorkbenchSecondaryActivityRoute,
  type WorkbenchSecondaryActivityItemsInput,
  type WorkbenchSecondaryActivityRoute,
} from './shell/secondary-actions.js';
export {
  WorkbenchProfileModal,
  type WorkbenchProfileDetail,
  type WorkbenchProfileInput,
  type WorkbenchProfileModalProps,
} from './workbench/profile-modal.js';
