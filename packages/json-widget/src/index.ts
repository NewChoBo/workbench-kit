// Slim kit v2 — public engine surface for studio-engine and other consumers.
// Grouping: parse → tree → selection → patch/history → layout → registry/schema.
// See docs/workbench/KIT_SURFACE.md for import guidance.

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
export type { WidgetPathSelectOptions } from './selection.js';
export {
  emptyWidgetSelection,
  firstSelectedWidgetPath,
  isWidgetPathSelected,
  selectWidgetPath,
  selectWidgetPathWithOptions,
  selectedWidgetPaths,
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

export type { WidgetPatchHistory, WidgetPatchHistoryState } from './widget-patch-history.js';
export { initializeWidgetPatchHistory } from './widget-patch-history.js';

export type { JsonWidgetEditorSyncInput, JsonWidgetEditorSyncSnapshot } from './editor-sync.js';
export {
  applyWidgetPatchToDocument,
  createJsonWidgetEditorSyncSnapshot,
  shouldResetSelectionOnDocumentChange,
} from './editor-sync.js';

/** @deprecated Prefer consumer-owned JSON schema. Kept for kit JsonWidgetEditor and Storybook. */
export {
  createPlaygroundWidgetJsonSchema,
  PLAYGROUND_WIDGET_JSON_SCHEMA,
} from './widget-json-schema.js';
