export type {
  WidgetInspectorField,
  WidgetInspectorSection,
  WidgetJsonSchema,
  WidgetMeasureConstraints,
  WidgetMeasureFunction,
  WidgetMeasureResult,
  WidgetRegistryContract,
  WidgetTypeDefinition,
  WidgetTypeShape,
} from '@workbench-kit/contracts';

export { WidgetRegistry, createWidgetRegistry, type WidgetDefinition } from './widget/registry.js';

export type { WidgetPath, WidgetPathSegment, WidgetSourceRange } from './document/path.js';

export {
  ROOT_WIDGET_PATH,
  appendBoxChildPath,
  appendChildrenPath,
  findLineAndColumnForPath,
  findPathForLineAndColumn,
  findSourceRangeForPath,
  parseWidgetPathKey,
  widgetPathEquals,
  widgetPathKey,
} from './document/path.js';

export type { WidgetSelectionState } from './document/selection.js';

export {
  emptyWidgetSelection,
  firstSelectedWidgetPath,
  isWidgetPathSelected,
  selectWidgetPath,
} from './document/selection.js';

export type { GenericWidget, WidgetNode, WidgetTreeEditResult } from './widget/tree.js';

export {
  collectWidgetNodes,
  getWidgetAtPath,
  getWidgetChildAtSegment,
  getWidgetChildren,
  getWidgetDisplayLabel,
  insertWidgetChildAtPath,
  removeWidgetAtPath,
  reorderWidgetChildAtPath,
  replaceWidgetAtPath,
  reparentWidgetAtPath,
  setBoxChildAtPath,
  updateWidgetAtPath,
} from './widget/tree.js';

export type { ArrayChildWidget } from './widget/child-ops.js';

export { collectAllContainerKeys, isContainerWidget } from './widget/child-ops.js';

export type {
  GridChildPlacement,
  GridLayoutSpec,
  LinearChildPlacement,
  LinearLayoutSpec,
  Rect,
  StackChildPlacement,
} from './layout/types.js';

export { computeGridChildRect } from './layout/grid.js';

export { computeLinearChildRects } from './layout/linear.js';

export { computeStackChildRect } from './layout/stack.js';

export {
  DEFAULT_LAYOUT_CONSTRAINTS,
  layoutWidget,
  type LayoutConstraints,
  type LayoutNodeResult,
  type LayoutWidgetOptions,
} from './layout/layout-widget.js';

export {
  estimateWrappedTextSize,
  type EstimateWrappedTextSizeInput,
  type EstimatedTextSize,
} from './layout/text-metrics.js';

export type {
  LayoutHitTestResult,
  LayoutPoint,
  WidgetDragMappingOptions,
  WidgetReparentMappingOptions,
  WidgetResizeHandlePosition,
  WidgetResizeMappingOptions,
} from './layout/layout-mapping.js';

export {
  createWidgetDragPatch,
  createWidgetReparentPatch,
  createWidgetResizePatch,
  findLayoutNodeByPath,
  hitTestLayoutTree,
} from './layout/layout-mapping.js';

export type { WidgetPatch } from './widget/patch.js';

export { applyWidgetPatch } from './widget/patch.js';

export type {
  JsonWidgetInvalidation,
  JsonWidgetListenBinding,
  JsonWidgetNode,
  JsonWidgetValueMap,
  ParsedJsonWidgetData,
} from './jdw/node.js';

export {
  collectJsonWidgetChangedValuePaths,
  collectJsonWidgetInvalidations,
  collectJsonWidgetListenBindings,
  collectJsonWidgetValueDependencies,
  formatJsonWidgetData,
  genericWidgetToJdwNode,
  isJsonWidgetDynamicValueExpression,
  jdwNodeToGenericWidget,
  parseJsonWidgetData,
  resolveJsonWidgetValues,
} from './jdw/node.js';

export type {
  JsonWidgetValueWarehouse,
  JsonWidgetValueWarehouseFlushEvent,
  JsonWidgetValueWarehouseListener,
  JsonWidgetValueWarehouseOptions,
} from './document/value-warehouse.js';

export { createJsonWidgetValueWarehouse } from './document/value-warehouse.js';

export type { WidgetDocument } from './document/document.js';

export {
  createWidgetDocument,
  EMPTY_WIDGET_DOCUMENT,
  formatWidgetDocumentJson,
} from './document/document.js';

export type {
  ApplyUiDocumentCommandResult,
  ApplyUiDesignSystemPackChangeResult,
  CreateUiDocumentResult,
  MigrateWidgetDocumentOptions,
  MigrateWidgetDocumentResult,
  UiAuthoringSessionCommandResult,
  UiAuthoringSessionState,
  UiDocument,
  UiDocumentCommand,
  UiDocumentCommandIssue,
  UiDocumentCommandIssueCode,
  UiDocumentHierarchyEntry,
  UiDocumentIssue,
  UiDocumentIssueCode,
  UiDocumentMigrationContext,
  UiDocumentMigrationFailure,
  UiDocumentMigrationIdentity,
  UiDocumentMigrationResolver,
  UiDocumentNode,
  UiDocumentNodeAuthoring,
  UiDocumentTransaction,
  UiDocumentTransactionIntent,
  UiDocumentTransactionRecord,
  UiDesignSystemPackChangeCommand,
  ProjectUiDesignSystemDocumentResult,
} from './ui-authoring/types.js';
export {
  UI_DOCUMENT_AUTHORING_ARG,
  UI_DOCUMENT_COMMAND_ISSUE_CODES,
  UI_DOCUMENT_ISSUE_CODES,
} from './ui-authoring/types.js';
export {
  createUiDocument,
  findUiDocumentNodePath,
  formatUiDocument,
  isStructurallyValidUiValueSource,
  listUiDocumentHierarchy,
  projectUiDocumentSelectionPaths,
  readUiDocumentNodeAuthoring,
  validateUiDocumentRoot,
  validateUiDocumentWrapperIdentity,
} from './ui-authoring/document.js';
export { applyUiDocumentCommand } from './ui-authoring/commands.js';
export {
  applyUiDesignSystemPackChange,
  projectUiDesignSystemDocument,
} from './ui-authoring/design-system.js';
export {
  applyUiAuthoringSessionCommand,
  createUiAuthoringSession,
  normalizeUiDocumentSelection,
  redoUiAuthoringSession,
  selectUiDocumentNodes,
  undoUiAuthoringSession,
} from './ui-authoring/session.js';
export { migrateWidgetDocumentToUiDocument } from './ui-authoring/migration.js';

export {
  createJdwDocumentJsonSchema,
  createWidgetJsonSchema,
  DEMO_WIDGET_JSON_SCHEMA,
} from './widget/json-schema.js';
export {
  WORKBENCH_JDW_PROFILE,
  WORKBENCH_JDW_BUILTIN_TYPES,
  WORKBENCH_KIT_EXTENSION_TYPES,
  WORKBENCH_JDW_KNOWN_TYPES,
  WORKBENCH_JDW_TYPE_SUPPORT,
  getWorkbenchJdwTypeSupport,
  listWorkbenchJdwTypesBySupportLevel,
  type WorkbenchJdwKnownType,
  type WorkbenchJdwSupportLevel,
  type WorkbenchJdwTypeCategory,
  type WorkbenchJdwTypeSupport,
} from './jdw/profile.js';
export {
  WORKBENCH_JDW_KNOWN_TYPE_FIXTURES,
  wrapWorkbenchJdwKnownTypeFixture,
} from './known/type-fixtures.js';
export {
  validateJsonWidgetData,
  validateJsonWidgetNode,
  type ValidatedJsonWidgetData,
  type ValidateJsonWidgetDataOptions,
  type ValidationIssue,
} from './validate/json-widget-data.js';
export {
  validateWidgetAssetPackage,
  WIDGET_ASSET_LEAF_CONTENT_TYPES,
  WIDGET_ASSET_CONTAINER_CONTENT_TYPES,
  type ValidatedWidgetAsset,
  type WidgetAssetLeafContentType,
  type WidgetAssetContainerContentType,
} from './validate/widget-asset.js';
export {
  WIDGET_ASSET_MANIFEST_FILENAME,
  WIDGET_ASSET_CONTENT_FILENAME,
  WIDGET_ASSET_SCHEMA_FILENAME,
  discoverWidgetAssetPackages,
  formatWidgetAssetContent,
  formatWidgetAssetManifest,
  type WidgetAssetManifestFields,
  inferWidgetAssetPackagePath,
  inferWidgetAssetSlugFromPackagePath,
  isWidgetAssetContentPath,
  isWidgetAssetManifestPath,
  isWidgetAssetPackageFilePath,
  isWidgetAssetSchemaPath,
  parseWidgetAssetPackage,
  resolveWidgetAssetPackageFiles,
  type ParsedWidgetAssetPackage,
  type WidgetAssetPackageFiles,
} from './widget/asset-package.js';
export { applyWidgetDocumentPatch } from './widget/apply-document-patch.js';
export {
  createWidgetAssetCatalog,
  materializeWidgetPlacementAsset,
  mergeWidgetAssetCatalogs,
  type MaterializeWidgetPlacementAssetOptions,
} from './widget/placement-asset.js';
export {
  mergeWidgetAssetInputs,
  resolveWidgetAssetContent,
  type ResolvedWidgetAssetContent,
} from './widget/asset-inputs.js';
export {
  assignGridSlot,
  ensureGridChildPlacements,
  normalizeWidgetForParent,
  normalizeWidgetForPlacementPolicy,
  normalizeWidgetSubtree,
  reflowGridChildren,
  resolvePlacementPolicy,
  stripExternalPlacement,
  type NormalizeWidgetOptions,
} from './widget/normalize.js';

export type {
  JdwScreenSpec,
  ScreenLayoutFrame,
  ScreenNode,
  ScreenTextStyle,
} from './screen-spec/types.js';
export {
  screenColumn,
  screenExpanded,
  screenGrid,
  screenPanel,
  screenRow,
  screenStack,
  screenText,
} from './screen-spec/builders.js';
export {
  createScreenSpecPaletteAssetCatalog,
  SCREEN_SPEC_PALETTE_ASSETS,
  type ScreenSpecPaletteWidgetAsset,
} from './screen-spec/assets.js';
export {
  compileScreenNode,
  compileScreenSpecToJdwNode,
  compileScreenSpecToJson,
} from './screen-spec/compile.js';
export {
  compileScreenSpecText,
  parseScreenSpecJson,
  type CompiledScreenSpecText,
  type ParsedScreenSpec,
} from './screen-spec/parse.js';
export {
  createDefaultScreenNode,
  formatScreenSpecJson,
  getScreenNodeAt,
  insertScreenNodeAt,
  isScreenContainerNode,
  listScreenSpecOutline,
  removeScreenNodeAt,
  resolveScreenInsertParentPath,
  screenNodePathToWidgetPath,
  updateScreenNodeAt,
  updateScreenSpecMetadata,
  widgetPathToScreenNodePath,
  type InsertScreenNodeResult,
  type RemoveScreenNodeResult,
  type ScreenNodePath,
  type ScreenPaletteKind,
  type ScreenSpecOutlineEntry,
} from './screen-spec/tree.js';

export type {
  CreateWidgetAssetCatalogFromJdwDocumentsOptions,
  CreateWidgetAssetDocumentOptions,
  WidgetAssetDocument,
  WorkspaceAssetFileRef,
} from './widget/asset-file.js';
export {
  EMPTY_WIDGET_ASSET_DOCUMENT,
  createWidgetAssetCatalogFromJdwDocuments,
  createWidgetAssetCatalogFromWorkspaceFiles,
  createWidgetAssetDocument,
  isJdwWorkspaceDocumentPath,
  normalizeWidgetPlacementAsset,
} from './widget/asset-file.js';

export type {
  ExpandJsonWidgetDocumentRefsOptions,
  ExpandJsonWidgetDocumentRefsResult,
  JsonWidgetDocumentRefIssue,
  JsonWidgetDocumentRefIssueCode,
} from './widget/document-ref.js';
export {
  expandJsonWidgetDocumentRefs,
  expandJsonWidgetDocumentRefsFromSource,
  isCircularJsonWidgetDocumentRefIssue,
  isJsonWidgetRefNode,
  joinJsonWidgetDocumentPath,
  normalizeJsonWidgetDocumentPath,
} from './widget/document-ref.js';
