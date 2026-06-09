export type {

  WidgetInspectorField,

  WidgetInspectorSection,

  WidgetJsonSchema,

  WidgetRegistryContract,

  WidgetTypeDefinition,

  WidgetTypeShape,

} from '@workbench-kit/contracts';



export { formatWidgetJson, parseWidgetJson, type ParsedWidgetJson } from './parse-widget-json.js';

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



export type { WidgetPatch } from './widget-patch.js';

export { applyWidgetPatch } from './widget-patch.js';



export type { WidgetDocument } from './document.js';

export { createWidgetDocument, EMPTY_WIDGET_DOCUMENT } from './document.js';

export { createWidgetJsonSchema, DEMO_WIDGET_JSON_SCHEMA } from './widget-json-schema.js';
export { applyWidgetDocumentPatch } from './apply-widget-document-patch.js';
export {
  createWidgetAssetCatalog,
  materializeWidgetPlacementAsset,
} from './widget-placement-asset.js';

export type {
  ParsedWidgetAssetJson,
  WidgetAssetDocument,
  WorkspaceAssetFileRef,
} from './widget-asset-file.js';
export {
  EMPTY_WIDGET_ASSET_DOCUMENT,
  WIDGET_ASSET_FILE_SUFFIX,
  createWidgetAssetCatalogFromWorkspaceFiles,
  createWidgetAssetDocument,
  formatWidgetAssetJson,
  inferWidgetAssetIdFromPath,
  isWidgetAssetFilePath,
  normalizeWidgetPlacementAsset,
  parseWidgetAssetJson,
} from './widget-asset-file.js';


