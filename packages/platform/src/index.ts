export type ServiceIdentifier<T> = symbol & { __serviceBrand: T };

export {
  WORKBENCH_AUTH_CAPABILITY_ID,
  WORKBENCH_SECRETS_CAPABILITY_ID,
  type WorkbenchAccount,
  type WorkbenchAccountChangeEvent,
  type WorkbenchAccountService,
  type WorkbenchAuthenticationService,
  type WorkbenchAuthProvider,
  type WorkbenchAuthSession,
  type WorkbenchAuthSignInOptions,
  type WorkbenchSecretStorageNamespace,
  type WorkbenchSecretStorageService,
} from './auth/types.js';
export { createMemorySecretStorage } from './auth/memory-secret-storage.js';
export {
  clearBrowserStorageByPrefixes,
  collectStorageKeysByPrefix,
  tryGetBrowserStorage,
  type BrowserStorageKind,
  type ClearBrowserStorageByPrefixesOptions,
} from './storage/browser-storage.js';
export {
  createAllowlistedHttpsFetch,
  type AllowlistedHttpsFetchPolicyViolation,
  type CreateAllowlistedHttpsFetchOptions,
} from './network/create-allowlisted-https-fetch.js';
export {
  createVersionedBrowserStateAdapter,
  type BrowserKeyValueStorage,
  type VersionedBrowserStateAdapter,
  type VersionedBrowserStateAdapterOptions,
} from './storage/versioned-browser-state.js';
export { CommandRegistry } from './commands/command-registry.js';
export {
  assertNoCommandDefinitionConflicts,
  canExecuteCommand,
  commandMenuEntries,
  commandMenuEntry,
  commandMenuSeparator,
  compactCommandMenuItems,
  createCommandRegistry,
  createCommandRegistryFromContributions,
  defineCommandContribution,
  executeCommand,
  findCommandDefinitionConflicts,
  mergeCommandContributions,
  resolveCommandDefinitionLabel,
  resolveCommandMenuCommandItem,
  resolveCommandMenuItems,
  resolveCommandValue,
  type CommandConflictPolicy,
  type CommandContribution,
  type CommandContributionInput,
  type CommandDefinitionConflict,
  type CommandMenuCommandItemInput,
  type CommandMenuCommandEntry,
  type CommandMenuEntry,
  type CommandMenuItem,
  type CommandMenuItemsInput,
  type CommandMenuSeparatorEntry,
  type CreateCommandRegistryOptions,
  type ResolvedCommandMenuCommandItem,
  type ResolvedCommandMenuSeparatorItem,
  type SourcedCommandContribution,
} from './commands/command-contributions.js';
export { CommandService, type CommandServiceOptions } from './commands/command-service.js';
export {
  CommandNoHandlerError,
  CommandNotEnabledError,
  CommandNotFoundError,
  type CommandDefinition,
  type CommandHandler,
  type CommandPredicate,
  type CommandServiceHandler,
  type CommandValue,
  type CommandWhenClause,
} from './commands/types.js';

export { ContextKeyService } from './context/context-key-service.js';
export {
  createWorkbenchContextKeySnapshot,
  evaluateWorkbenchContextKeyWhenClause,
  filterWorkbenchContributionsByWhenClause,
  isWorkbenchContextKeyValue,
  type WorkbenchContextKeySnapshot,
  type WorkbenchContextKeyValue,
  type WorkbenchWhenClauseContributionLike,
} from './context/context-keys.js';
export { evaluateWhenClause } from './context/evaluate-when.js';
export {
  evaluateWorkbenchWhenClause,
  WorkbenchWhenClauseSyntaxError,
} from './context/when-clause.js';
export {
  isContextKeyTruthy,
  type ContextKeyChangeEvent,
  type ContextKeyValue,
} from './context/context-key-value.js';
export {
  WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_MANAGE_COMMANDS,
  WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_MANAGE_EXTENSIONS,
  WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_OPEN_SETTINGS,
  WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_USE_CHAT,
  WORKBENCH_PERMISSION_CONTEXT_KEY_CAN_USE_SEARCH,
  WORKBENCH_PERMISSION_CONTEXT_KEY_ROLE,
  WORKBENCH_PERMISSION_CONTEXT_KEY_TIER,
  createWorkbenchPermissionContextKeys,
  resolveWorkbenchPermissionCapabilities,
  type WorkbenchPermissionCapabilities,
  type WorkbenchPermissionContextInput,
  type WorkbenchPermissionRole,
} from './context/permission-context-keys.js';

export { KeybindingRegistry } from './keybindings/keybinding-registry.js';
export {
  buildKeybindingManagementEntries,
  filterKeybindingManagementEntries,
  findKeybindingConflict,
  type KeybindingManagementCommandInput,
  type KeybindingManagementEntry,
} from './keybindings/build-keybinding-management-entries.js';
export { formatKeybindingLabel } from './keybindings/format-keybinding-label.js';
export {
  getEffectiveKeybindingForCommand,
  resolveKeybindingWithOverrides,
} from './keybindings/resolve-keybinding-with-overrides.js';
export {
  type KeybindingDefinition,
  type KeybindingMatch,
  type KeybindingResolveOptions,
} from './keybindings/types.js';
export {
  buildWorkbenchViewActivityBarModel,
  buildWorkbenchViewEditorTabs,
  resolveWorkbenchViewTabClosable,
  type WorkbenchViewActivityBarItem,
  type WorkbenchViewActivityBarModel,
  type WorkbenchViewActivityBarPlacement,
  type WorkbenchViewContribution,
  type WorkbenchViewEditorTabItem,
  type WorkbenchViewTabClosePolicy,
} from './view/workbench-view-model.js';
export {
  buildWorkbenchViewPlacementModel,
  resolveWorkbenchViewContainerRegistry,
  type BuildWorkbenchViewPlacementModelInput,
  type ResolveWorkbenchViewContainerRegistryInput,
  type WorkbenchViewContainerRegistry,
  type WorkbenchViewPlacementContainerLike,
  type WorkbenchViewPlacementModel,
  type WorkbenchViewPlacementViewLike,
} from './view/workbench-view-placement.js';
export {
  listWorkbenchSidebarSlotViewIds,
  oppositeWorkbenchSidebarSlot,
  coerceWorkbenchSidebarSlotViewId,
  resolveWorkbenchSidebarActivityViewId,
  resolveWorkbenchSidebarSlotActiveViewId,
  resolveWorkbenchSidebarSlotContent,
  resolveWorkbenchSidebarSlotViewIdAfterMove,
  shouldShowWorkbenchSidebarSlotActionBar,
  type ResolveWorkbenchSidebarSlotActiveViewIdInput,
  type ResolveWorkbenchSidebarSlotContentInput,
  type ResolveWorkbenchSidebarSlotViewIdAfterMoveInput,
  type ResolveWorkbenchSidebarSlotViewIdAfterMoveResult,
  type WorkbenchSidebarSlotContent,
  type WorkbenchSidebarSlotId,
  type WorkbenchSidebarSlotViewContent,
} from './view/workbench-sidebar-slot.js';
export {
  moveWorkbenchSidebarSlotViewOrder,
  normalizeWorkbenchSidebarSlotViewOrder,
  sortWorkbenchSidebarSlotViewIds,
  type MoveWorkbenchSidebarSlotViewOrderInput,
  type WorkbenchSidebarSlotViewOrders,
} from './view/workbench-sidebar-slot-view-order.js';
export {
  applyWorkbenchActivityBarPlacementHints,
  filterWorkbenchActivityBarItemsByPrimarySlot,
  resolveWorkbenchActivityBarItemTitle,
  type WorkbenchActivityBarItemLike,
} from './view/workbench-activity-bar-placement.js';
export {
  createWorkbenchShellNavigate,
  resolveWorkbenchShellViewFocus,
  resolveWorkbenchSidebarSlotDisplayedViewId,
  type CreateWorkbenchShellNavigateInput,
  type ResolveWorkbenchSidebarSlotDisplayedViewIdInput,
  type WorkbenchShellNavigateModalTarget,
  type WorkbenchShellNavigateSlotRouter,
} from './view/workbench-shell-navigate.js';
export {
  areWorkbenchViewRouteSnapshotsEqual,
  buildWorkbenchViewRouteSearch,
  closeWorkbenchViewRoute,
  normalizeWorkbenchViewRouteTabs,
  openWorkbenchViewRoute,
  switchWorkbenchViewRoute,
  resolveWorkbenchViewRouteSnapshot,
  type BuildWorkbenchViewRouteSearchOptions,
  type CloseWorkbenchViewRouteOptions,
  type NormalizeWorkbenchViewRouteTabsOptions,
  type ResolveWorkbenchViewRouteSnapshotOptions,
  type WorkbenchViewRouteSnapshot,
} from './view/workbench-view-route.js';
export {
  createMemoryJsonDocumentStore,
  parseVersionedEnvelope,
  type MemoryJsonDocumentStoreOptions,
} from './storage/memory-json-document-store.js';
export {
  createMemoryJsonLinesStore,
  type MemoryJsonLinesStoreOptions,
} from './storage/memory-json-lines-store.js';
export type {
  JsonDocumentMigration,
  JsonDocumentReadResult,
  JsonDocumentStore,
  JsonLinesReadResult,
  JsonLinesStore,
  StorageDiagnostic,
  StorageDiagnosticCode,
  VersionedEnvelope,
} from './storage/types.js';
export {
  applyWindowFocusablePolicy,
  applyWindowResidencyPolicy,
  type ApplyWindowFocusablePolicyInput,
  type ApplyWindowResidencyPolicyInput,
  type FocusableWindowSurface,
  type ResidencyWindowSurface,
  type WindowPointerPassthroughPolicy,
  type WindowZOrder,
} from './window/apply-window-residency.js';
export {
  bindSecondaryWindowBoundsPersistence,
  type BindSecondaryWindowBoundsPersistenceOptions,
  type SecondaryWindowBoundsHandlers,
  type SecondaryWindowBoundsPersistenceHandle,
} from './window/bind-secondary-window-bounds-persistence.js';
export {
  bindWindowBoundsPersistence,
  type WindowBoundsPersistenceHandle,
} from './window/bind-window-bounds-persistence.js';
export {
  WINDOW_BOUNDS_MIN_HEIGHT,
  WINDOW_BOUNDS_MIN_WIDTH,
  clampWindowBoundsToDisplays,
  selectWindowDisplayForBounds,
  type ClampWindowBoundsToDisplaysOptions,
} from './window/clamp-window-bounds-to-displays.js';
export {
  DEFAULT_WINDOW_OPEN_HEIGHT,
  DEFAULT_WINDOW_OPEN_WIDTH,
  createDefaultWindowOpenBounds,
  resolveWindowOpenLayout,
  type DefaultWindowOpenBoundsOptions,
  type ResolveWindowOpenLayoutInput,
  type ResolvedWindowOpenLayout,
} from './window/resolve-window-open-layout.js';
export { resizeRect } from './window/resize-rect.js';
export {
  shouldHideOnClose,
  shouldQuitWhenAllWindowsClosed,
  type ShouldHideOnCloseInput,
  type ShouldQuitWhenAllWindowsClosedInput,
  type TrayClosePlatformId,
} from './window/tray-close-policy.js';
export {
  assertPositiveWorkArea,
  normalizeBoundsToPlacement,
  resolvePlacementToBounds,
} from './window/work-area-placement.js';
export type {
  DisplayWorkArea,
  PersistableWindow,
  RectLike,
  RememberedWindowState,
  ResizeEdge,
  ResizeRectOptions,
  SizeUnit,
  WorkAreaPlacement,
} from './window/types.js';
