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

export interface WidgetRendererEventLike {
  readonly type?: unknown;
  readonly kind?: unknown;
  readonly widgetId?: unknown;
  readonly value?: unknown;
  readonly payload?: unknown;
}

const WIDGET_RENDERER_EVENT_TYPES_MAP = {
  'on-press': 'press',
  'on-change': 'change',
} as const;

export function isWidgetRendererEventKind(value: string): value is WidgetRendererEventKind {
  return value === 'press' || value === 'change';
}

function normalizeWidgetRendererEventType(value: string): WidgetRendererEventKind | null {
  if (isWidgetRendererEventKind(value)) {
    return value;
  }
  return (
    value in WIDGET_RENDERER_EVENT_TYPES_MAP
      ? WIDGET_RENDERER_EVENT_TYPES_MAP[value as keyof typeof WIDGET_RENDERER_EVENT_TYPES_MAP]
      : null
  ) as WidgetRendererEventKind | null;
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

export function normalizeWidgetRendererEvent(
  event: WidgetRendererEventLike,
): WidgetRendererEvent | null {
  if (isWidgetRendererEvent(event)) {
    return {
      type: event.type,
      widgetId: event.widgetId,
      ...(event.value === undefined ? undefined : { value: event.value }),
    };
  }

  if (!event || typeof event !== 'object') {
    return null;
  }

  const candidate = event as {
    type?: unknown;
    kind?: unknown;
    widgetId?: unknown;
    value?: unknown;
    payload?: unknown;
  };
  if (typeof candidate.widgetId !== 'string' || candidate.widgetId.length === 0) {
    return null;
  }

  const candidateType = candidate.type ?? candidate.kind;
  if (typeof candidateType !== 'string') {
    return null;
  }

  const normalizedType = normalizeWidgetRendererEventType(candidateType);
  if (normalizedType === null) {
    return null;
  }

  if (candidate.payload !== undefined && typeof candidate.payload !== 'string') {
    return null;
  }
  if (candidate.value !== undefined && typeof candidate.value !== 'string') {
    return null;
  }

  const value = candidate.value === undefined ? candidate.payload : candidate.value;
  return {
    type: normalizedType,
    widgetId: candidate.widgetId,
    ...(value === undefined ? undefined : { value }),
  };
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
