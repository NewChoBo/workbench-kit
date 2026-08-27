export { ActivityBar } from './shell/ActivityBar';
export type { ActivityBarItem, ActivityBarProps } from './shell/ActivityBar';
export { createStringDragMime, createTypedDragMime } from '../utils/dragMime';
export type { TypedDragMime, TypedDragMimeOptions } from '../utils/dragMime';
export {
  EDITOR_TAB_DRAG_DATA_TYPE,
  getEditorTabDropPosition,
  isEditorTabMoveNoop,
  isEditorTabsScrollerEventTarget,
  normalizeEditorTabReorderIndex,
  readEditorTabDragPayload,
  resolveEditorTabDropTarget,
  resolveEditorTabStripDropTarget,
} from './editor/editor-tabs-dnd';
export type { EditorTabDragPayload, EditorTabDropTarget } from './editor/editor-tabs-dnd';
export { useEditorTabsStripDnd } from './editor/useEditorTabsStripDnd';
export type {
  UseEditorTabsStripDndOptions,
  UseEditorTabsStripDndResult,
} from './editor/useEditorTabsStripDnd';
export {
  WorkbenchArtifactModeControls,
  WorkbenchArtifactPreview,
  WorkbenchArtifactShell,
  formatWorkbenchArtifactContent,
  getWorkbenchArtifactExtension,
  getWorkbenchArtifactTitle,
  getWorkbenchPreviewRenderer,
  getWorkbenchPreviewRendererMatch,
  selectWorkbenchPreviewRenderer,
} from './shell/ArtifactShell';
export type {
  WorkbenchArtifactDescriptor,
  WorkbenchArtifactMode,
  WorkbenchArtifactModeControlsProps,
  WorkbenchArtifactPreviewProps,
  WorkbenchArtifactShellProps,
  WorkbenchArtifactShellRenderCode,
  WorkbenchArtifactShellRenderPreview,
  WorkbenchPreviewRenderer,
  WorkbenchPreviewRendererContext,
  WorkbenchPreviewRendererMatch,
  WorkbenchPreviewRendererMatchReason,
} from './shell/ArtifactShell';
export {
  WorkbenchCommandGroupShell,
  WorkbenchCommandList,
  WorkbenchCommandPalette,
  WorkbenchCommandSuggest,
  commandMenuItemsToWorkbenchCommandDescriptors,
  commandMenuItemToWorkbenchCommandDescriptor,
  filterWorkbenchCommands,
  getNextWorkbenchCommandIndex,
  getWorkbenchCommandExecutionLabel,
  getWorkbenchCommandExecutionPolicyLabel,
  getWorkbenchCommandStatusLabel,
  groupWorkbenchCommands,
  isWorkbenchCommandExecutionPolicy,
  isWorkbenchCommandRunnable,
  resolveWorkbenchCommandExecutionPolicy,
} from './commands/CommandPalette';
export {
  DEFAULT_QUICK_OPEN_SEARCH_DEBOUNCE_MS,
  WORKSPACE_FILES_QUICK_OPEN_PROVIDER_ID,
  WorkbenchQuickOpen,
  createWorkspaceFilesQuickOpenProvider,
  getNextQuickOpenItemIndex,
  isQuickOpenItemSelectable,
  resolveQuickOpenItemPath,
} from './commands/WorkbenchQuickOpen';
export { WorkbenchMarkdownPreview } from './markdown/MarkdownPreview';
export type { WorkbenchMarkdownPreviewProps } from './markdown/MarkdownPreview';
export { sanitizeMarkdownHref } from './markdown/sanitizeMarkdownHref';
export {
  workbenchMarkdownRemarkPlugins,
  workbenchMarkdownRehypePlugins,
} from './markdown/markdownRemarkPlugins';
export {
  ChatCommandProposalCard,
  ChatConversationBar,
  ChatHistoryMenu,
  ChatPanel,
  ChatPhasedRunProgress,
  ChatRenameDialog,
  DEFAULT_RUNTIME_UNMOUNT_CANCELLABLE_STATUSES,
  defaultWorkbenchChatConversationLabels,
  shouldCancelRuntimeOnUnmount,
  useCancelRuntimeOnUnmount,
} from './chat';
export type {
  ChatCommandProposal,
  ChatCommandProposalCardProps,
  ChatCommandProposalStatus,
  ChatConversationBarProps,
  ChatHistoryMenuProps,
  ChatPanelProps,
  ChatPhasedRunProgressAction,
  ChatPhasedRunProgressLabels,
  ChatPhasedRunProgressProps,
  ChatRenameDialogProps,
  ChatRunPhase,
  ChatRunPhaseStatus,
  UseCancelRuntimeOnUnmountOptions,
  WorkbenchChatConversation,
  WorkbenchChatConversationLabels,
} from './chat';
export { getSlashCommandQuery, isSlashCommandInput, parseSlashCommand } from './chat/slashCommand';
export { useSlashCommandSuggest } from './chat/useSlashCommandSuggest';
export type {
  UseSlashCommandSuggestOptions,
  UseSlashCommandSuggestResult,
} from './chat/useSlashCommandSuggest';
export {
  WORKBENCH_ACTIVE_EDITOR_SAVE_SHORTCUT_ATTRIBUTE,
  hasWorkbenchModalDialogOpen,
  isWorkbenchSaveShortcutEvent,
  useWorkbenchNativeContextMenuGuard,
  useWorkbenchNativeSaveGuard,
} from './commands/keyboard';
export { resolveWorkbenchTheme, useResolvedWorkbenchTheme } from './theme/theme';
export type { ResolvedWorkbenchTheme } from './theme/theme';
export { useDeferredWorkbenchMount } from './shell/useDeferredWorkbenchMount';
export type { UseDeferredWorkbenchMountOptions } from './shell/useDeferredWorkbenchMount';
export {
  DEFAULT_WORKBENCH_HARD_RESET_CONFIRM_MESSAGE,
  DEFAULT_WORKBENCH_STORAGE_PREFIX,
  performWorkbenchHardReset,
} from './shell/hardReset';
export type { WorkbenchHardResetOptions } from './shell/hardReset';
export {
  applyWorkbenchAppearance,
  applyWorkbenchThemeAttributes,
  applyWorkbenchThemeProviderAttributes,
  DARK_THEME_PRESET_OPTIONS,
  DARK_THEME_PRESET_MANIFEST,
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_LIGHT_THEME_PRESET,
  isDarkThemePresetId,
  isLightThemePresetId,
  LIGHT_THEME_PRESET_OPTIONS,
  LIGHT_THEME_PRESET_MANIFEST,
  resolveActiveThemePreset,
  resolveWorkbenchThemeProviderAttributes,
  WORKBENCH_COLOR_SCHEME_OPTIONS,
} from './theme/themePresets';
export {
  WORKBENCH_APPEARANCE_FIELD_DESCRIPTIONS,
  WORKBENCH_APPEARANCE_FIELD_LABELS,
} from './shell/appearanceLabels';
export type {
  DarkThemePresetId,
  LightThemePresetId,
  ResolveWorkbenchThemeProviderAttributesInput,
  ThemePresetId,
  WorkbenchAppearanceSettings,
  WorkbenchColorSchemePreference,
  WorkbenchThemeDocumentAttributes,
  WorkbenchThemeProviderAttributes,
  WorkbenchThemePresetOption,
  WorkbenchThemePresetManifestEntry,
  WorkbenchThemePresetSelection,
} from './theme/themePresets';
export {
  applyWorkbenchShellAttributes,
  DEFAULT_SHELL_PRESET,
  isShellPresetId,
  SHELL_PRESET_MANIFEST,
  SHELL_PRESET_OPTIONS,
} from './shell/shellPresets';
export type {
  ShellPresetId,
  WorkbenchShellPresetManifestEntry,
  WorkbenchShellPresetOption,
} from './shell/shellPresets';
export { WorkbenchThemeProvider } from './theme/WorkbenchThemeProvider';
export type { WorkbenchThemeProviderProps } from './theme/WorkbenchThemeProvider';
export { useWorkbenchAppearanceDocumentSync } from './shell/useWorkbenchAppearanceDocumentSync';
export {
  WorkbenchPlatformProvider,
  useWorkbenchHostPlatform,
} from './chrome/WorkbenchPlatformContext';
export type { WorkbenchPlatformProviderProps } from './chrome/WorkbenchPlatformContext';
export {
  resolveWorkbenchHostPlatform,
  resolveWorkbenchWindowChromeDataAttributes,
} from './chrome/workbenchPlatformChrome';
export type {
  WorkbenchHostPlatform,
  WorkbenchWindowChromeMode,
} from './chrome/workbenchPlatformChrome';
export {
  WorkbenchWindowChromeControls,
  shouldUseDarwinPlatformChrome,
} from './shell/WorkbenchWindowChromeControls';
export type { WorkbenchWindowChromeControlsProps } from './shell/WorkbenchWindowChromeControls';
export {
  WorkbenchShortcutCommandBridge,
  getWorkbenchShortcutCommandBindings,
  getWorkbenchShortcutFromEvent,
  matchesWorkbenchShortcut,
  runWorkbenchShortcutCommand,
  useWorkbenchShortcutCommands,
} from './commands/ShortcutCommandBridge';
export type { SlashCommandParseResult } from './chat/slashCommand';
export type {
  WorkbenchCommandDescriptor,
  WorkbenchCommandDescriptorOverrides,
  WorkbenchCommandExecution,
  WorkbenchCommandExecutionPolicy,
  WorkbenchCommandFeedback,
  WorkbenchCommandFilterInput,
  WorkbenchCommandGroup,
  WorkbenchCommandGroupBy,
  WorkbenchCommandGroupShellProps,
  WorkbenchCommandGroupingInput,
  WorkbenchCommandListProps,
  WorkbenchCommandNavigationInput,
  WorkbenchCommandOutput,
  WorkbenchCommandPaletteProps,
  WorkbenchCommandRunContext,
  WorkbenchCommandRunSource,
  WorkbenchCommandSideEffect,
  WorkbenchCommandStatus,
  WorkbenchCommandSuggestProps,
} from './commands/CommandPalette';
export type { ResolveWorkbenchCommandExecutionPolicyInput } from './commands/CommandPalette';
export type {
  CreateWorkspaceFilesQuickOpenProviderOptions,
  QuickOpenItem,
  QuickOpenProvider,
  QuickOpenSearchContext,
  QuickOpenSelectContext,
  WorkbenchQuickOpenProps,
} from './commands/WorkbenchQuickOpen';
export type {
  UseWorkbenchShortcutCommandsOptions,
  WorkbenchShortcutCommandBinding,
  WorkbenchShortcutCommandBindingInput,
  WorkbenchShortcutCommandBridgeProps,
  WorkbenchShortcutCommandMissReason,
  WorkbenchShortcutCommandRunInput,
  WorkbenchShortcutCommandRunResult,
  WorkbenchShortcutEventLike,
  WorkbenchShortcutMatchInput,
  WorkbenchShortcutPlatform,
} from './commands/ShortcutCommandBridge';
export {
  WorkbenchConfirmationFlow,
  getWorkbenchConfirmationButtonVariant,
  getWorkbenchConfirmationConfirmLabel,
  getWorkbenchConfirmationSideEffect,
  getWorkbenchConfirmationStatus,
  getWorkbenchConfirmationVariant,
  isWorkbenchConfirmationActionDisabled,
} from './commands/ConfirmationFlow';
export type {
  WorkbenchConfirmationAction,
  WorkbenchConfirmationCancelContext,
  WorkbenchConfirmationCloseContext,
  WorkbenchConfirmationConfirmContext,
  WorkbenchConfirmationContext,
  WorkbenchConfirmationFlowProps,
  WorkbenchConfirmationReason,
  WorkbenchConfirmationSideEffect,
  WorkbenchConfirmationVariant,
} from './commands/ConfirmationFlow';
export {
  WorkbenchAuthGate,
  WorkbenchLoginBrandMark,
  WorkbenchLoginView,
  WorkbenchPasswordResetView,
  WorkbenchSignUpView,
} from './auth';
export type {
  WorkbenchAuthGateProps,
  WorkbenchAuthStatus,
  WorkbenchLoginCredentials,
  WorkbenchLoginSubmitContext,
  WorkbenchLoginViewProps,
  WorkbenchPasswordResetCredentials,
  WorkbenchPasswordResetSubmitContext,
  WorkbenchPasswordResetViewProps,
  WorkbenchSignUpCredentials,
  WorkbenchSignUpSubmitContext,
  WorkbenchSignUpViewProps,
} from './auth';
export { WorkbenchBootstrapGate, WorkbenchBootstrapView, useWorkbenchBootstrap } from './bootstrap';
export type {
  WorkbenchBootstrapController,
  WorkbenchBootstrapGateProps,
  WorkbenchBootstrapRunStatus,
  WorkbenchBootstrapTaskDefinition,
  WorkbenchBootstrapTaskStatus,
  WorkbenchBootstrapTaskViewModel,
  WorkbenchBootstrapViewProps,
} from './bootstrap';
export {
  WORKBENCH_EDITOR_CLOSE_ALL_COMMAND_ID,
  WORKBENCH_EDITOR_CLOSE_COMMAND_ID,
  WORKBENCH_EDITOR_CLOSE_OTHERS_COMMAND_ID,
  WORKBENCH_EDITOR_CLOSE_TO_RIGHT_COMMAND_ID,
  WORKBENCH_EDITOR_COPY_PATH_COMMAND_ID,
  WORKBENCH_EDITOR_DELETE_COMMAND_ID,
  WORKBENCH_EDITOR_DISCARD_CHANGES_COMMAND_ID,
  WORKBENCH_EDITOR_SAVE_COMMAND_ID,
  WORKBENCH_EDITOR_SPLIT_DOWN_COMMAND_ID,
  WORKBENCH_EDITOR_SPLIT_RIGHT_COMMAND_ID,
  WORKBENCH_EDITOR_TOGGLE_PINNED_COMMAND_ID,
  WORKBENCH_COMMAND_SURFACE_ACTIVITY_BAR,
  WORKBENCH_COMMAND_SURFACE_EDITOR,
  WORKBENCH_COMMAND_SURFACE_SEARCH,
  WORKBENCH_COMMAND_SURFACE_SETTINGS,
  WORKBENCH_COMMAND_SURFACE_WORKSPACE,
  WORKBENCH_OPEN_SETTINGS_COMMAND_ID,
  WORKBENCH_TOGGLE_FOCUS_MODE_COMMAND_ID,
  WORKBENCH_SEARCH_COPY_RESULT_PATH_COMMAND_ID,
  WORKBENCH_SEARCH_DELETE_RESULT_COMMAND_ID,
  WORKBENCH_SEARCH_OPEN_RESULT_COMMAND_ID,
  WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID,
  WORKBENCH_WORKSPACE_COPY_PATH_COMMAND_ID,
  WORKBENCH_WORKSPACE_DELETE_COMMAND_ID,
  WORKBENCH_WORKSPACE_NEW_FILE_COMMAND_ID,
  WORKBENCH_WORKSPACE_NEW_FOLDER_COMMAND_ID,
  WORKBENCH_WORKSPACE_OPEN_COMMAND_ID,
  WORKBENCH_WORKSPACE_RENAME_COMMAND_ID,
  commandMenuItemsToContextMenuItems,
  createWorkbenchEditorCommands,
  createWorkbenchEditorTabListMenuEntries,
  createWorkbenchEditorTabMenuEntries,
  createWorkbenchStandaloneEditorTabMenuEntries,
  createWorkbenchSearchResultCommands,
  createWorkbenchSearchResultMenuEntries,
  createWorkbenchShellCommands,
  createWorkbenchShellMenuEntries,
  createWorkbenchWorkspaceCommands,
  createWorkbenchWorkspaceCreateMenuEntries,
  createWorkbenchWorkspaceFolderMenuEntries,
  createWorkbenchWorkspaceTargetMenuEntries,
  getWorkbenchShowActivityCommandId,
} from './commands/commands';
export type {
  WorkbenchEditorCommandContext,
  WorkbenchSearchResultCommandContext,
  WorkbenchShellCommandActivity,
  WorkbenchShellCommandContext,
  WorkbenchShellCommandPresetOptions,
  WorkbenchCommandSurface,
  WorkbenchWorkspaceCommandContext,
} from './commands/commands';
export {
  initializeWorkbenchShellState,
  useWorkbenchShellState,
  workbenchShellStateReducer,
} from './shell/shellState';
export type {
  UseWorkbenchShellStateResult,
  WorkbenchShellAction,
  WorkbenchShellInitialState,
  WorkbenchShellState,
} from './shell/shellState';
export {
  getWorkbenchStatusDescriptor,
  getWorkbenchStatusLabel,
  getWorkbenchStatusVariant,
  isWorkbenchStatus,
  isWorkbenchStatusBusy,
  isWorkbenchStatusDisabled,
  isWorkbenchStatusUnavailable,
  workbenchStatusFromLifecycleStatus,
} from './shell/status';
export type {
  WorkbenchStatus,
  WorkbenchStatusDescriptor,
  WorkbenchStatusVariant,
} from './shell/status';
export { SplitView } from './shell/SplitView';
export type { SplitViewLayoutMode, SplitViewProps } from './shell/SplitView';
export { StatusBar, StatusBarItem, StatusBarSection } from './shell/StatusBar';
export type {
  StatusBarItemModel,
  StatusBarItemProps,
  StatusBarProps,
  StatusBarSectionAlign,
  StatusBarSectionModel,
  StatusBarSectionProps,
} from './shell/StatusBar';
export {
  WorkbenchTimeline,
  WorkbenchTimelineItem,
  formatWorkbenchTimelineMetadataValue,
  getWorkbenchTimelineEventIconClass,
  getWorkbenchTimelineEventLabel,
  getWorkbenchTimelineEventStatus,
  getWorkbenchTimelineMetadataEntries,
} from './shell/Timeline';
export type {
  WorkbenchTimelineEvent,
  WorkbenchTimelineEventKind,
  WorkbenchTimelineItemProps,
  WorkbenchTimelineMessageSource,
  WorkbenchTimelineMetadataEntry,
  WorkbenchTimelineProps,
  WorkbenchTimelineRenderContext,
  WorkbenchTimelineRenderMetadata,
  WorkbenchTimelineRenderPayload,
  WorkbenchTimelineVariant,
} from './shell/Timeline';
export {
  WorkbenchPanelRegion,
  WorkbenchNavigationPanel,
  WorkbenchSectionedPanel,
  WorkbenchSettingsModal,
  WorkbenchStructuredDataForm,
  WorkbenchStructuredDataSchemaFieldInput,
  WorkbenchStructuredDataSchemaPanel,
  WorkbenchStructuredDataSchemaPanelEmbed,
  WorkbenchStructuredDataSchemaPanelFrame,
  WorkbenchStructuredDataTableView,
  WorkbenchStructuredDataTextArrayInput,
  buildWorkbenchStructuredDataTableFromRecords,
  formatWorkbenchStructuredDataTableCell,
  useWorkbenchSettingsCommit,
} from './settings';
export {
  AccountManagementPanel,
  CommandManagementPanel,
  ExtensionManagementPanel,
  ExtensionManagementSidebar,
  KeybindingManagementPanel,
  ManagementPanelEmptyState,
  ManagementPanelFrame,
  ManagementPanelRunState,
  ManagementPanelSummary,
  ManagementPanelToolbar,
  buildCommandManagementGroups,
  countCommandManagementEntries,
  filterCommandManagementGroups,
  useManagementPanelQuery,
} from './management';
export type {
  AccountManagementEntry,
  AccountManagementEntryStatus,
  AccountManagementPanelProps,
  CommandManagementEntry,
  CommandManagementEntryStatus,
  CommandManagementGroup,
  CommandManagementPanelProps,
  CommandManagementRunState,
  ExtensionCatalogBrowseEntry,
  ExtensionManagementEntry,
  ExtensionManagementPanelProps,
  ExtensionManagementSidebarProps,
  ExtensionManagementTransition,
  KeybindingManagementPanelProps,
  ManagementPanelFrameProps,
  ManagementPanelToolbarProps,
} from './management';
export type {
  WorkbenchPanelRegionProps,
  WorkbenchNavigationPanelProps,
  WorkbenchSectionedPanelItem,
  WorkbenchSectionedPanelProps,
  WorkbenchSectionedPanelScrollSpyAxis,
  WorkbenchSchemaFormCancelContext,
  WorkbenchSchemaFormCheckboxField,
  WorkbenchSchemaFormErrors,
  WorkbenchSchemaFormField,
  WorkbenchSchemaFormFieldBase,
  WorkbenchSchemaFormFieldChangeContext,
  WorkbenchSchemaFormFieldType,
  WorkbenchSchemaFormFieldValue,
  WorkbenchSchemaFormNumberField,
  WorkbenchSchemaFormOption,
  WorkbenchSchemaFormProps,
  WorkbenchSchemaFormSelectField,
  WorkbenchSchemaFormSettingSpec,
  WorkbenchSchemaFormSettingValueType,
  WorkbenchSchemaFormSettingsCategoryInput,
  WorkbenchSchemaFormSubmitContext,
  WorkbenchSchemaFormTextField,
  WorkbenchSchemaFormValues,
  WorkbenchSettingsCategory,
  WorkbenchSettingsCommitContextValue,
  WorkbenchSettingsCommitMode,
  WorkbenchSettingsModalProps,
  WorkbenchSettingsPreferenceChange,
  WorkbenchSettingsScope,
  WorkbenchStructuredDataFieldType,
  WorkbenchStructuredDataFieldValue,
  WorkbenchStructuredDataFormCancelContext,
  WorkbenchStructuredDataFormCheckboxField,
  WorkbenchStructuredDataFormErrors,
  WorkbenchStructuredDataFormField,
  WorkbenchStructuredDataFormFieldBase,
  WorkbenchStructuredDataFormFieldChangeContext,
  WorkbenchStructuredDataFormNumberField,
  WorkbenchStructuredDataFormOption,
  WorkbenchStructuredDataFormProps,
  WorkbenchStructuredDataFormSection,
  WorkbenchStructuredDataFormSelectField,
  WorkbenchStructuredDataFormSubmitContext,
  WorkbenchStructuredDataFormTextArrayField,
  WorkbenchStructuredDataFormTextField,
  WorkbenchStructuredDataTextArrayInputProps,
  WorkbenchStructuredDataPath,
  WorkbenchStructuredDataRecord,
  WorkbenchStructuredDataSchemaDocument,
  WorkbenchStructuredDataSchemaFieldControl,
  WorkbenchStructuredDataSchemaFieldDefinition,
  WorkbenchStructuredDataSchemaFieldInputProps,
  WorkbenchStructuredDataSchemaPanelClassNames,
  WorkbenchStructuredDataSchemaPanelLabels,
  WorkbenchStructuredDataSchemaPanelProps,
  WorkbenchStructuredDataSchemaPanelEmbedProps,
  WorkbenchStructuredDataSchemaPanelFrameHeaderContent,
  WorkbenchStructuredDataSchemaPanelFrameProps,
  WorkbenchStructuredDataTableViewProps,
  WorkbenchStructuredDataSchemaSectionAliases,
  WorkbenchStructuredDataSchemaSectionSummary,
  WorkbenchStructuredDataSchemaTableColumnInput,
  WorkbenchStructuredDataSchemaTableDefinition,
  WorkbenchStructuredDataSchemaTableRowKeyInput,
  WorkbenchStructuredDataTable,
  WorkbenchStructuredDataTableCellContext,
  WorkbenchStructuredDataTableColumn,
  WorkbenchStructuredDataTableRow,
} from './settings';
export {
  WorkbenchSchemaForm,
  appendWorkbenchStructuredDataSchemaTableRow,
  asWorkbenchStructuredDataRecord,
  booleanWorkbenchStructuredDataSchemaFieldValue,
  buildWorkbenchStructuredDataSchemaSelectOptions,
  coerceWorkbenchStructuredDataFormFieldValue,
  coerceWorkbenchStructuredDataSchemaFieldValue,
  coerceWorkbenchSchemaFormFieldValue,
  coerceWorkbenchSchemaFormSettingDefaultValue,
  createWorkbenchStructuredDataSchemaDocumentEmptyRow,
  createWorkbenchStructuredDataSchemaEmptyRow,
  createWorkbenchStructuredDataSchemaDocumentSampleData,
  createWorkbenchStructuredDataSchemaFallbackSection,
  createWorkbenchSchemaFormFieldFromSettingSpec,
  createWorkbenchSchemaFormFieldsFromSettingSpecs,
  createWorkbenchSchemaFormSettingsCategory,
  formatWorkbenchStructuredDataSchemaValue,
  formatWorkbenchStructuredDataSchemaLabel,
  getWorkbenchStructuredDataFormErrors,
  getWorkbenchStructuredDataFormFieldDefaultValue,
  getWorkbenchStructuredDataFormFieldError,
  getWorkbenchStructuredDataFormFields,
  getWorkbenchStructuredDataSchemaDocumentColumnDefinition,
  getWorkbenchStructuredDataSchemaDocumentColumnLabel,
  getWorkbenchStructuredDataSchemaDocumentFieldDefinition,
  getWorkbenchStructuredDataSchemaDocumentFieldLabel,
  getWorkbenchStructuredDataSchemaDocumentPanelData,
  getWorkbenchStructuredDataSchemaDocumentSectionValue,
  getWorkbenchStructuredDataSchemaDocumentSections,
  getWorkbenchStructuredDataSchemaDocumentTableColumns,
  getWorkbenchStructuredDataSchemaDocumentTableDefinition,
  getWorkbenchStructuredDataSchemaFieldDataPath,
  getWorkbenchStructuredDataSchemaFieldControl,
  getWorkbenchStructuredDataSchemaFieldDefaultValue,
  getWorkbenchStructuredDataSchemaFieldDescription,
  getWorkbenchStructuredDataSchemaFieldDefinition,
  getWorkbenchStructuredDataSchemaSectionAnchorId,
  getWorkbenchStructuredDataSchemaSectionId,
  getWorkbenchStructuredDataSchemaSectionPath,
  getWorkbenchStructuredDataSchemaTableCellPath,
  getWorkbenchStructuredDataSchemaTableColumns,
  getWorkbenchStructuredDataSchemaTablePath,
  getWorkbenchStructuredDataSchemaTableRowKey,
  getWorkbenchStructuredDataSchemaTableRows,
  hasWorkbenchStructuredDataSchemaSelectOptions,
  isWorkbenchStructuredDataSchemaColorField,
  getWorkbenchStructuredDataValue,
  getWorkbenchSchemaFormErrors,
  getWorkbenchSchemaFormFieldDefaultValue,
  getWorkbenchSchemaFormFieldError,
  isWorkbenchStructuredDataFormSubmittable,
  isWorkbenchSchemaFormSubmittable,
  normalizeWorkbenchStructuredDataFormData,
  normalizeWorkbenchSchemaFormValues,
  removeWorkbenchStructuredDataSchemaTableRow,
  setWorkbenchStructuredDataPathOrRootValue,
  setWorkbenchStructuredDataValue,
  shouldUseWorkbenchStructuredDataSchemaRadioControl,
  slugWorkbenchStructuredDataSchemaAnchor,
  stringifyWorkbenchStructuredDataSchemaFieldValue,
  validateWorkbenchStructuredDataSchemaFieldValue,
} from './settings';
export { WorkbenchShell } from './shell/WorkbenchShell';
export type { WorkbenchShellProps } from './shell/WorkbenchShell';
export { WorkbenchViewEditor } from './shell/WorkbenchViewEditor';
export type {
  WorkbenchViewEditorDataAttributes,
  WorkbenchViewEditorEmptyState,
  WorkbenchViewEditorEmptyStateProps,
  WorkbenchViewEditorEmptyStateSurfaceProps,
  WorkbenchViewEditorProps,
} from './shell/WorkbenchViewEditor';
export { WorkbenchEditorTabs } from './editor/WorkbenchEditorTabs';
export type {
  WorkbenchEditorTabCommandFocusDisposition,
  WorkbenchEditorTabCommandFocusEvent,
  WorkbenchEditorTabsProps,
} from './editor/WorkbenchEditorTabs';
export {
  createWorkbenchStandaloneEditorTabCommandContext,
  createWorkbenchStandaloneEditorTabContextMenuItems,
  isWorkbenchEditorTabClosable,
} from './editor/editorTabContextMenu';
export type {
  CreateWorkbenchStandaloneEditorTabCommandContextInput,
  CreateWorkbenchStandaloneEditorTabContextMenuItemsInput,
  WorkbenchStandaloneEditorTabLike,
} from './editor/editorTabContextMenu';
export { useWorkbenchEditorTabContextMenu } from './editor/useWorkbenchEditorTabContextMenu';
export type {
  UseWorkbenchEditorTabContextMenuOptions,
  UseWorkbenchEditorTabContextMenuResult,
} from './editor/useWorkbenchEditorTabContextMenu';
export { WorkbenchViewSidebar } from './shell/WorkbenchViewSidebar';
export type {
  WorkbenchViewSidebarItem,
  WorkbenchViewSidebarProps,
} from './shell/WorkbenchViewSidebar';
export {
  WorkbenchDesktopTitleBar,
  WorkbenchDesktopWindowControls,
} from './shell/WorkbenchDesktopTitleBar';
export type {
  WorkbenchDesktopTitleBarProps,
  WorkbenchDesktopWindowControlsProps,
} from './shell/WorkbenchDesktopTitleBar';
export { WorkbenchStandaloneShell } from './shell/WorkbenchStandaloneShell';
export { WorkbenchCanvasShell } from './shell/WorkbenchCanvasShell';
export type {
  WorkbenchActivityLifecycleCallbackMap,
  WorkbenchActivityLifecycleCallbacks,
  WorkbenchActivityLifecycleEvent,
  WorkbenchPrimarySidebarLifecycle,
  WorkbenchPrimarySidebarLifecycleCallbacks,
  WorkbenchPrimarySidebarLifecycleReason,
  WorkbenchStandaloneShellContext,
  WorkbenchStandaloneShellProps,
} from './shell/WorkbenchStandaloneShell';
export {
  createWorkbenchStandaloneShellStateSnapshot,
  useWorkbenchStandaloneShellContext,
} from './shell/workbenchStandaloneShellReactContext';
export type {
  WorkbenchStandaloneShellStateChange,
  WorkbenchStandaloneShellStateChangeKind,
  WorkbenchStandaloneShellStateSnapshot,
} from './shell/workbenchStandaloneShellReactContext';
export { useWorkbenchStandaloneShellStateSync } from './shell/useWorkbenchStandaloneShellStateSync';
export type { WorkbenchCanvasShellProps } from './shell/WorkbenchCanvasShell';
export type {
  WorkbenchActivityChangeEvent,
  WorkbenchActivityDescriptor,
  WorkbenchChatController,
  WorkbenchHostCallbackBoundary,
  WorkbenchPatchController,
  WorkbenchSaveController,
  WorkbenchShellContract,
  WorkbenchStandaloneBootstrap,
  WorkbenchStandaloneBootstrapEvent,
  WorkbenchStandaloneEntryState,
  WorkbenchStatusController,
  WorkbenchTheme,
  WorkbenchWorkspaceController,
} from './shell/standalone';
export { StructuredArtifactEditor } from './shell/StructuredArtifactEditor';
export type { StructuredArtifactEditorProps } from './shell/StructuredArtifactEditor';
export type {
  WorkbenchDocument,
  WorkbenchDocumentAdapter,
  WorkbenchDocumentMeta,
  WorkbenchDocumentNode,
  WorkbenchDocumentNodeBase,
  WorkbenchDocumentContainerNode,
  WorkbenchDocumentLeafNode,
  WorkbenchDocumentPatch,
  WorkbenchDocumentPatchOp,
  WorkbenchDocumentRenderContext,
  WorkbenchNodeConstraints,
  WorkbenchNodeLayout,
  WorkbenchNodeType,
  WorkbenchPage,
  WorkbenchVisualStyle,
} from './schema';
export type {
  WorkbenchDocumentPatchError,
  WorkbenchDocumentPatchResult,
  WorkbenchDocumentPatchHistory,
  WorkbenchDocumentPatchHistoryState,
  WorkbenchDocumentAction,
  WorkbenchDocumentActionResult,
  WorkbenchDocumentActionType,
} from './schema';
export {
  applyWorkbenchDocumentPatch,
  createPatchFromWorkbenchDocumentAction,
  assertWorkbenchDocument,
  deserializeWorkbenchDocumentPatch,
  isWorkbenchDocumentSupported,
  initializeWorkbenchDocumentPatchHistory,
} from './schema';
export {
  buildWorkspaceDocumentLookup,
  documentNodesToWorkspaceFiles,
  workspaceFilesToDocument,
} from './schema';
export type {
  WorkspaceToWorkbenchDocumentOptions,
  WorkbenchToWorkspaceConversionOptions,
} from './schema';
export type { WorkbenchDocumentRendererProps } from './schema';
export { WorkbenchDocumentRenderer } from './schema';
