export type {
  WidgetInspectorField,
  WidgetInspectorSection,
  WidgetJsonSchema,
  WidgetRegistryContract,
  WidgetTypeDefinition,
  WidgetTypeShape,
} from '@workbench-kit/contracts';

export { WidgetRegistry, createWidgetRegistry, type WidgetDefinition } from './widget-registry.js';

export type { WidgetPath, WidgetPathSegment } from './path.js';

export {
  ROOT_WIDGET_PATH,
  appendBoxChildPath,
  appendChildrenPath,
  findLineAndColumnForPath,
  findPathForLineAndColumn,
  parseWidgetPathKey,
  widgetPathEquals,
  widgetPathKey,
} from './path.js';

export type { WidgetSelectionState } from './selection.js';

export {
  emptyWidgetSelection,
  firstSelectedWidgetPath,
  isWidgetPathSelected,
  selectWidgetPath,
} from './selection.js';

export type { GenericWidget, WidgetNode, WidgetTreeEditResult } from './widget-tree.js';

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
} from './widget-tree.js';

export type { ArrayChildWidget } from './widget-child-ops.js';

export { collectAllContainerKeys, isContainerWidget } from './widget-child-ops.js';

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
} from './layout/layout-widget.js';

export type { WidgetPatch } from './widget-patch.js';

export { applyWidgetPatch } from './widget-patch.js';

export type { JsonWidgetNode, ParsedJsonWidgetData } from './jdw-node.js';

export {
  formatJsonWidgetData,
  genericWidgetToJdwNode,
  jdwNodeToGenericWidget,
  parseJsonWidgetData,
} from './jdw-node.js';

export type { WidgetDocument } from './document.js';

export {
  createWidgetDocument,
  EMPTY_WIDGET_DOCUMENT,
  formatWidgetDocumentJson,
} from './document.js';

export { createWidgetJsonSchema, DEMO_WIDGET_JSON_SCHEMA } from './widget-json-schema.js';
export {
  WORKBENCH_JDW_PROFILE,
  WORKBENCH_JDW_BUILTIN_TYPES,
  WORKBENCH_KIT_EXTENSION_TYPES,
  WORKBENCH_JDW_KNOWN_TYPES,
  type WorkbenchJdwKnownType,
} from './jdw-profile.js';
export {
  validateJsonWidgetData,
  validateJsonWidgetNode,
  type ValidatedJsonWidgetData,
  type ValidateJsonWidgetDataOptions,
  type ValidationIssue,
} from './validate-json-widget-data.js';
export { validateWidgetAssetPackage, type ValidatedWidgetAsset } from './validate-widget-asset.js';
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
} from './widget-asset-package.js';
export { applyWidgetDocumentPatch } from './apply-widget-document-patch.js';
export {
  createWidgetAssetCatalog,
  materializeWidgetPlacementAsset,
  mergeWidgetAssetCatalogs,
} from './widget-placement-asset.js';
export {
  assignGridSlot,
  normalizeWidgetForParent,
  normalizeWidgetForPlacementPolicy,
  normalizeWidgetSubtree,
  resolvePlacementPolicy,
  stripExternalPlacement,
  type NormalizeWidgetOptions,
} from './widget-normalize.js';

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
  getScreenNodeAt,
  listScreenSpecOutline,
  updateScreenNodeAt,
  updateScreenSpecMetadata,
  type ScreenNodePath,
  type ScreenSpecOutlineEntry,
} from './screen-spec/tree.js';

export type {
  CreateWidgetAssetDocumentOptions,
  WidgetAssetDocument,
  WorkspaceAssetFileRef,
} from './widget-asset-file.js';
export {
  EMPTY_WIDGET_ASSET_DOCUMENT,
  createWidgetAssetCatalogFromWorkspaceFiles,
  createWidgetAssetDocument,
  normalizeWidgetPlacementAsset,
} from './widget-asset-file.js';
