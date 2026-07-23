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

export function isWidgetRendererEventKind(value: string): value is WidgetRendererEventKind {
  return value === 'press' || value === 'change';
}

export function isWidgetRendererEvent(value: unknown): value is WidgetRendererEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    type?: unknown;
    kind?: unknown;
    widgetId?: unknown;
    value?: unknown;
  };
  if (typeof candidate.widgetId !== 'string' || candidate.widgetId.length === 0) {
    return false;
  }

  if (typeof candidate.type !== 'string' || !isWidgetRendererEventKind(candidate.type)) {
    return false;
  }

  if (candidate.value !== undefined && typeof candidate.value !== 'string') {
    return false;
  }

  return true;
}

export function normalizeWidgetRendererEvent(event: unknown): WidgetRendererEvent | null {
  if (isWidgetRendererEvent(event)) {
    return {
      type: event.type,
      widgetId: event.widgetId,
      ...(event.value === undefined ? undefined : { value: event.value }),
    };
  }

  return null;
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
