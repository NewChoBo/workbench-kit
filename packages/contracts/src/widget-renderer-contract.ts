export type WidgetRendererEventKind = 'press' | 'change';

/**
 * UI-agnostic event emitted by widget renderers when they need host input/interaction
 * feedback. Kept in contracts so widget data format is stable across host apps.
 */
export interface WidgetRendererEvent {
  readonly type: WidgetRendererEventKind;
  readonly widgetId: string;
  readonly value?: string;
}

/**
 * Minimal widget descriptor used by widget registry-like renderers.
 */
export interface WidgetRendererShape {
  readonly type: string;
}

/**
 * Renderer placement bounds for deterministic host composition.
 */
export interface WidgetRendererRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Generic widget renderer prop envelope consumed by host adapters.
 */
export interface WidgetRendererProps<W extends WidgetRendererShape = WidgetRendererShape> {
  readonly widget: W;
  readonly rect: WidgetRendererRect;
  readonly bypassRegistry?: boolean;
  readonly fillParent?: boolean;
  readonly onEvent?: ((event: WidgetRendererEvent) => void) | undefined;
}

export type WidgetRendererComponent<W extends WidgetRendererShape = WidgetRendererShape> = (
  props: WidgetRendererProps<W>,
) => unknown;
