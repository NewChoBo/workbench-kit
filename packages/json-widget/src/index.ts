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
  replaceWidgetAtPath,
} from './widget-tree.js';

export type { WidgetPatch } from './widget-patch.js';
export { applyWidgetPatch } from './widget-patch.js';

export type { JsonWidgetEditorSyncInput, JsonWidgetEditorSyncSnapshot } from './editor-sync.js';
export {
  applyWidgetPatchToDocument,
  createJsonWidgetEditorSyncSnapshot,
  shouldResetSelectionOnDocumentChange,
} from './editor-sync.js';
