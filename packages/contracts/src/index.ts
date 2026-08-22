export type {
  ChatMessage,
  ChatMessageSource,
  ChatStreamEvent,
  ChatSessionStatus,
  ChatStreamMessageDeltaPayload,
  ChatStreamMessagePayload,
  ChatStreamStatusPayload,
  ChatTransport,
  ChatTransportListener,
  ChatServiceSnapshot,
  ChatEventDispatcher,
  ChatEventServiceListener,
} from './chat/chat';
export {
  AbstractChatTransport,
  isChatStatusEvent,
  isDeltaEvent,
  isMessageEvent,
} from './chat/chat';

export type {
  WorkbenchDerivedProjectionDescriptor,
  WorkbenchEditableProjectionAuthority,
  WorkbenchEditableProjectionDescriptor,
  WorkbenchEditableProjectionKind,
  WorkbenchEditableProjectionPort,
  WorkbenchProjectionAuthority,
  WorkbenchProjectionDescriptor,
  WorkbenchProjectionDescriptorBase,
  WorkbenchProjectionFailureCode,
  WorkbenchProjectionKind,
  WorkbenchProjectionPort,
  WorkbenchProjectionRejectionCode,
  WorkbenchProjectionRevision,
  WorkbenchProjectionSnapshot,
  WorkbenchProjectionTransaction,
  WorkbenchProjectionTransactionResult,
  WorkbenchReadOnlyProjectionAuthority,
  WorkbenchReadOnlyProjectionDescriptor,
  WorkbenchReadOnlyProjectionPort,
  WorkbenchRuntimeProjectionDescriptor,
  WorkbenchRuntimeProjectionKind,
} from './projection/projection';
export { isWorkbenchProjectionDescriptor } from './projection/projection';

export type {
  WorkspacePatchApplyFailure,
  WorkspacePatchApplyResult,
  WorkspacePatchApplyStatus,
  WorkspacePatchApplySuccess,
  WorkspacePatchContext,
  WorkspacePatchDeleteFile,
  WorkspacePatchEvent,
  WorkspacePatchSource,
  WorkspacePatchWriteFile,
  WorkspacePatchApplier,
  WorkspacePatchConflictCode,
} from './patch/patch';
export {
  AbstractPatchApplier,
  isPatchSuccess,
  isWorkspacePatchDeleteFile,
  isWorkspacePatchWriteFile,
} from './patch/patch';

export type {
  WorkbenchDocument,
  WorkbenchDocumentAction,
  WorkbenchDocumentActionBase,
  WorkbenchDocumentActionResult,
  WorkbenchDocumentActionType,
  WorkbenchDocumentAdapter,
  WorkbenchDocumentContainerNode,
  WorkbenchDocumentCreateAction,
  WorkbenchDocumentDeleteAction,
  WorkbenchDocumentLeafNode,
  WorkbenchDocumentMeta,
  WorkbenchDocumentMoveAction,
  WorkbenchDocumentNode,
  WorkbenchDocumentNodeBase,
  WorkbenchDocumentPatch,
  WorkbenchDocumentPatchAction,
  WorkbenchDocumentPatchOp,
  WorkbenchDocumentRenderContext,
  WorkbenchDocumentReplaceAction,
  WorkbenchDocumentReplaceContentAction,
  WorkbenchDocumentReplaceLayoutAction,
  WorkbenchDocumentReplaceStyleAction,
  WorkbenchDocumentRenameAction,
  WorkbenchNodeConstraints,
  WorkbenchNodeLayout,
  WorkbenchNodeType,
  WorkbenchPage,
  WorkbenchVisualStyle,
  WorkspaceToWorkbenchDocumentOptions,
  WorkbenchToWorkspaceConversionOptions,
} from './document/workbench-document';
export {
  buildWorkspaceDocumentLookup,
  documentNodesToWorkspaceFiles,
  workspaceFilesToDocument,
} from './document/adapter';
export { createPatchFromWorkbenchDocumentAction } from './document/actions';
export {
  applyWorkbenchDocumentPatch,
  assertWorkbenchDocument,
  deserializeWorkbenchDocumentPatch,
  initializeWorkbenchDocumentPatchHistory,
  isWorkbenchDocumentSupported,
} from './document/patch';
export type {
  WorkbenchDocumentPatchError,
  WorkbenchDocumentPatchHistory,
  WorkbenchDocumentPatchHistoryState,
  WorkbenchDocumentPatchResult,
} from './document/patch';

export type {
  SaveConflictCode,
  SaveDraftInput,
  SaveFailure,
  SaveInput,
  SaveResult,
  SaveServiceResult,
  WorkspaceFile,
  WorkspaceFileListOptions,
  WorkspaceFileRepository,
  WorkspaceFileSource,
  SaveSuccess,
} from './save/save';
export type {
  InstalledPlugin,
  PluginCommandContribution,
  PluginCommandDefinition,
  PluginContributions,
  PluginDescriptor,
  PluginEnablementState,
  PluginLifecycleFailureCode,
  PluginLifecycleFailure,
  PluginLifecycleResult,
  PluginLifecycleService,
  PluginLifecycleState,
  PluginLifecycleSuccess,
  PluginSource,
  PluginTrustState,
  PluginMenuCommandEntry,
  PluginMenuEntry,
  PluginMenuSeparatorEntry,
  PluginPredicate,
  PluginValue,
} from './plugin/plugin';
export {
  isPluginEnabled,
  isPluginLifecycleFailure,
  isPluginLifecycleSuccess,
} from './plugin/plugin';
export type {
  LibraryItemDescriptor,
  LibraryDragPayload,
  LibraryCatalogSnapshot,
  LibraryItemKind,
  LibraryQuery,
  LibraryManifest,
  LibraryManifestErrorCode,
  LibraryProvider,
  LibraryProviderSummary,
  LibraryQueryOptions,
  LibraryServiceResult,
  LibrarySource,
  LibrarySourceKind,
  LibrarySortMode,
  ServiceLibraryFailure,
  ServiceLibrarySuccess,
} from './library/library';
export {
  LIBRARY_DRAG_DATA_TYPE,
  LIBRARY_DRAG_IDS_DATA_TYPE,
  createLibraryDragPayload,
  matchesLibraryItem,
  parseLibraryDragPayload,
  parseLibraryManifest,
  parseLibraryManifestText,
} from './library/library';
export {
  createLibraryItemIdentity,
  DEFAULT_LIBRARY_ITEM_FALLBACK_SOURCE_ID,
  normalizeLibraryItemProviderSource,
  resolveLibraryItemProviderId,
  resolveLibraryItemSourceId,
} from './library/library';
export type {
  LaunchTarget,
  LaunchpadDataBindingSyncMode,
  LaunchpadLibraryArtworkBinding,
  LaunchpadLibraryExecution,
  LaunchpadLibraryItemBinding,
  LaunchpadLibraryItemMapping,
  LaunchpadLibraryItemSummary,
  LaunchpadLibraryReferencePayload,
} from './library/launchpad-mapping';
export {
  canMapLibraryItemToLaunchpadTile,
  createLaunchpadLibraryItemTileBinding,
  deriveLaunchWorkingDirectory,
  inferLaunchTypeFromTarget,
  isPlayableLaunchTarget,
  normalizeLaunchTarget,
  resolveLaunchpadLibraryItemMapping,
  resolveLibraryItemPlayExecution,
} from './library/launchpad-mapping';
export type { ExternalUrlPolicy } from './url/external-url';
export { EXTERNAL_URL_PROTOCOLS, normalizeExternalUrlTarget } from './url/external-url';
export type { ResourceIdentity, ResourceIdentityKey, ResourceUri } from './resource/uri';
export {
  createResourceIdentity,
  createResourceIdentityKey,
  isSameResourceUri,
  normalizeResourceUri,
} from './resource/uri';
export type {
  ServiceFailure,
  ServiceFailureCode,
  ServiceListener,
  ServiceResultEnvelope,
} from './result/result';
export { normalizeServiceFailureMessage } from './result/result';
export { AbstractWorkspaceFileRepository, isSaveFailure, isSaveSuccess } from './save/save';
export type {
  UiPropertyDescriptor,
  UiPropertyValue,
  UiValueEditorDescriptor,
  UiValueSchema,
  UiValueSource,
  UiValueSourceKind,
  UiValueType,
  WidgetInspectorScalarValue,
} from './ui-authoring/types';
export { UI_VALUE_SOURCE_KINDS } from './ui-authoring/types';
export type {
  UiLiteralValidator,
  UiValueSourceReferenceField,
  UiValueValidationIssue,
  UiValueValidationIssueCode,
  ValidateUiPropertyValueOptions,
} from './ui-authoring/validation';
export {
  UI_VALUE_VALIDATION_ISSUE_CODES,
  isUiValueSourceKind,
  normalizeUiAllowedSources,
  validateUiPropertyDescriptor,
  validateUiPropertyValue,
} from './ui-authoring/validation';
export { widgetInspectorFieldToUiPropertyDescriptor } from './ui-authoring/widget-inspector-adapter';
export type {
  UiBorderStyle,
  UiBorderValue,
  UiBuiltinLayoutPropertyGroup,
  UiBuiltinLayoutStrategyKind,
  UiCanvasPlacementValue,
  UiCanvasSizeConstraintsValue,
  UiCrossAxisAlignment,
  UiDimensionValue,
  UiFlexChildValue,
  UiFlexContainerValue,
  UiFlexFractionValue,
  UiFlexWrap,
  UiGridMinMaxValue,
  UiGridPlacementValue,
  UiGridRepeatValue,
  UiGridTrackBreadthValue,
  UiGridTrackListValue,
  UiGridTrackValue,
  UiIntrinsicSizeKeyword,
  UiIntrinsicSizeValue,
  UiLayoutAnchor,
  UiLayoutDirection,
  UiLayoutPropertyDescriptor,
  UiLayoutPropertyGroup,
  UiLayoutPropertyScope,
  UiLayoutStrategyDescriptor,
  UiLayoutStrategyKind,
  UiLengthOrPercentageValue,
  UiLengthUnit,
  UiLengthValue,
  UiMainAxisAlignment,
  UiOverlayPlacementValue,
  UiPercentageValue,
  UiRadiusValue,
  UiSelfAlignment,
  UiShadowValue,
  UiSpacingValue,
  UiSplitValue,
} from './ui-authoring/layout-types';
export {
  UI_BORDER_STYLES,
  UI_CROSS_AXIS_ALIGNMENTS,
  UI_FLEX_WRAPS,
  UI_INTRINSIC_SIZE_KEYWORDS,
  UI_LAYOUT_ANCHORS,
  UI_LAYOUT_DIRECTIONS,
  UI_LAYOUT_PROPERTY_GROUPS,
  UI_LAYOUT_PROPERTY_SCOPES,
  UI_LAYOUT_STRATEGY_KINDS,
  UI_LENGTH_UNITS,
  UI_MAIN_AXIS_ALIGNMENTS,
  isUiLayoutAnchor,
  isUiLayoutPropertyScope,
  isUiLayoutStrategyKind,
  isUiLengthUnit,
} from './ui-authoring/layout-types';
export type {
  UiLayoutValidationIssue,
  UiLayoutValidationIssueCode,
  ValidateUiDimensionValueOptions,
  ValidateUiSpacingValueOptions,
} from './ui-authoring/layout-validation';
export {
  UI_LAYOUT_VALIDATION_ISSUE_CODES,
  isUiLayoutValidationIssueCode,
  validateUiBorderValue,
  validateUiCanvasPlacementValue,
  validateUiDimensionValue,
  validateUiFlexChildValue,
  validateUiFlexContainerValue,
  validateUiGridPlacementValue,
  validateUiGridTrackListValue,
  validateUiLayoutStrategyDescriptor,
  validateUiOverlayPlacementValue,
  validateUiRadiusValue,
  validateUiShadowValue,
  validateUiSpacingValue,
  validateUiSplitValue,
} from './ui-authoring/layout-validation';
export type {
  UiLayoutInspectorGroupResolution,
  UiResolvedLayoutInspectorGroup,
} from './ui-authoring/layout-inspector';
export { resolveUiLayoutInspectorGroups } from './ui-authoring/layout-inspector';
export type {
  UiAtomicComponentDescriptor,
  UiBindingDirection,
  UiChildSlotCardinality,
  UiComponentAccessibilityDescriptor,
  UiComponentBindingDescriptor,
  UiComponentCatalogContribution,
  UiComponentDescriptor,
  UiComponentDescriptorBase,
  UiComponentDesignTimeMetadata,
  UiComponentEventDescriptor,
  UiComponentKind,
  UiComponentLayoutSupport,
  UiComponentRef,
  UiComponentChildSlotDescriptor,
  UiCompositeComponentDescriptor,
} from './ui-authoring/component-types';
export {
  UI_BINDING_DIRECTIONS,
  UI_CHILD_SLOT_CARDINALITIES,
  UI_COMPONENT_KINDS,
  isUiBindingDirection,
  isUiChildSlotCardinality,
  isUiComponentKind,
} from './ui-authoring/component-types';
export type {
  UiComponentValidationIssue,
  UiComponentValidationIssueCode,
} from './ui-authoring/component-validation';
export {
  UI_COMPONENT_VALIDATION_ISSUE_CODES,
  isUiComponentValidationIssueCode,
  uiComponentRefKey,
  validateUiComponentDescriptor,
} from './ui-authoring/component-validation';
export type {
  UiComponentCatalogContract,
  UiComponentCatalogResolution,
} from './ui-authoring/component-catalog';
export { resolveUiComponentCatalog } from './ui-authoring/component-catalog';
export {
  uiComponentContributionFromWidgetAssetCatalog,
  uiComponentContributionFromWidgetRegistry,
} from './ui-authoring/component-adapters';
export type {
  WidgetRendererComponent,
  WidgetRendererEvent,
  WidgetRendererEventKind,
  WidgetRendererProps,
  WidgetRendererRect,
  WidgetRendererShape,
} from './widget/renderer-contract';
export {
  isWidgetRendererEvent,
  isWidgetRendererEventKind,
  normalizeWidgetRendererEvent,
} from './widget/renderer-contract';
export type {
  WidgetInspectorField,
  WidgetInspectorSection,
  WidgetJsonSchema,
  WidgetHostTag,
  WidgetMeasureConstraints,
  WidgetMeasureFunction,
  WidgetMeasureResult,
  WidgetRegistryContract,
  WidgetTypeDefinition,
  WidgetTypeShape,
} from './widget/registry-contract';
export { WIDGET_HOST_TAGS, isWidgetHostTag } from './widget/registry-contract';
export type {
  WidgetAssetCatalogContract,
  WidgetPlacementAsset,
  WidgetPlacementAssetCategory,
  WidgetPlacementAssetKind,
  WidgetPlacementPolicy,
} from './widget/placement-asset-contract';
export type {
  MappedLaunchAction,
  ProviderCommandAction,
  ProviderEpicAction,
  ProviderEpicActionMode,
  ProviderExecAction,
  ProviderFolderAction,
  ProviderLaunchActionKind,
  ProviderLibraryAction,
  ProviderScriptAction,
  ProviderSteamAction,
  ProviderSteamActionMode,
  ProviderUrlAction,
} from './library/provider-mapping';
export {
  createEpicStoreUrl,
  providerActionIcon,
  providerActionToLaunchAction,
  providerActionTypeLabel,
} from './library/provider-mapping';
export type {
  SampleHostBackendAuthStatus,
  SampleHostBackendClient,
  SampleHostBackendErrorBody,
  SampleHostBackendErrorCode,
  SampleHostBackendLinkedAccount,
  SampleHostBackendLinkedAccountStatus,
  SampleHostBackendProfile,
  SampleHostBackendSession,
  SampleHostBackendSessionQuery,
  SampleHostBackendSignInRequest,
} from './sample-host/backend-api';
export {
  SampleHostBackendApiError,
  SampleHostBackendRoutes,
  SAMPLE_HOST_BACKEND_API_PREFIX,
  SAMPLE_HOST_BACKEND_API_VERSION,
  createSampleHostBackendErrorBody,
  isSampleHostBackendApiError,
  isSampleHostBackendErrorBody,
  parseSampleHostBackendSession,
} from './sample-host/backend-api';
