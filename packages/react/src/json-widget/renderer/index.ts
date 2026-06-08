export { WidgetRenderer } from './WidgetRenderer.js';
export type { WidgetRendererComponent, WidgetRendererProps } from './contract.js';
export type { WidgetRendererEvent, WidgetRendererRect, WidgetRendererShape } from './contract.js';
export {
  WidgetRendererProvider,
  useWidgetAssetResolver,
  useWidgetRendererRegistry,
} from './context.js';
export type {
  WidgetAssetResolver,
  WidgetRendererProviderProps,
  WidgetRendererRegistry,
} from './context.js';
export {
  createWidgetRendererRegistry,
  type WidgetRendererDefinition,
} from './createWidgetRendererRegistry.js';
export {
  BUILTIN_WIDGET_RENDERER_MAP,
  BUILTIN_WIDGET_TYPES,
  BoxRenderer,
  DividerRenderer,
  GridRenderer,
  ImageRenderer,
  LinearRenderer,
  SpacerRenderer,
  StackRenderer,
  TextRenderer,
  getBuiltinWidgetRenderer,
  isBuiltinWidgetType,
  type BuiltinWidgetType,
} from './builtin-renderers.js';
