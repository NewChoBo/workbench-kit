export const WORKBENCH_KIT_PLATFORM_VERSION = '0.0.0' as const;

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
export {
  clearBrowserStorageByPrefixes,
  collectStorageKeysByPrefix,
  type BrowserStorageKind,
  type ClearBrowserStorageByPrefixesOptions,
} from './browser-storage.js';
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
  isWorkbenchContextKeyValue,
  type WorkbenchContextKeySnapshot,
  type WorkbenchContextKeyValue,
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
  type WorkbenchViewContribution,
  type WorkbenchViewEditorTabItem,
  type WorkbenchViewTabClosePolicy,
} from './workbench-view-model.js';
export {
  buildWorkbenchViewPlacementModel,
  resolveWorkbenchViewContainerRegistry,
  type BuildWorkbenchViewPlacementModelInput,
  type ResolveWorkbenchViewContainerRegistryInput,
  type WorkbenchViewContainerRegistry,
  type WorkbenchViewPlacementContainerLike,
  type WorkbenchViewPlacementModel,
  type WorkbenchViewPlacementViewLike,
} from './workbench-view-placement.js';
export {
  areWorkbenchViewRouteSnapshotsEqual,
  buildWorkbenchViewRouteSearch,
  closeWorkbenchViewRoute,
  normalizeWorkbenchViewRouteTabs,
  openWorkbenchViewRoute,
  resolveWorkbenchViewRouteSnapshot,
  type BuildWorkbenchViewRouteSearchOptions,
  type CloseWorkbenchViewRouteOptions,
  type NormalizeWorkbenchViewRouteTabsOptions,
  type ResolveWorkbenchViewRouteSnapshotOptions,
  type WorkbenchViewRouteSnapshot,
} from './workbench-view-route.js';
