import type { CSSProperties } from 'react';
import type { GenericWidget, Rect } from '@workbench-kit/json-widget';

export function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function readBoolean(value: unknown): boolean {
  return value === true;
}

export function isGenericWidget(value: unknown): value is GenericWidget {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

export function readChildren(widget: GenericWidget): GenericWidget[] {
  return Array.isArray(widget.children) ? widget.children.filter(isGenericWidget) : [];
}

/**
 * Absolute positioning style shared by every renderer so children compose
 * deterministically within their parent's computed rect.
 */
export function positionStyle(rect: Rect, fillParent?: boolean): CSSProperties {
  if (fillParent) return { position: 'absolute', inset: 0 };
  return {
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
  };
}
