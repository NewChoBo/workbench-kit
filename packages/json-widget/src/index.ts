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
