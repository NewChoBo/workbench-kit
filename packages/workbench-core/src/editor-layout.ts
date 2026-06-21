import type { MoveEditorOptions } from './editor-service.js';

export type EditorGroupDropSide = 'bottom' | 'center' | 'left' | 'right' | 'top';

export interface EditorDropPoint {
  readonly x: number;
  readonly y: number;
}

export interface EditorDropRect {
  readonly bottom: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
}

export interface ResolveEditorGroupDropSideOptions {
  readonly point: EditorDropPoint;
  readonly rect: EditorDropRect;
}

export interface CreateEditorGroupDropMoveOptionsInput {
  readonly dropSide: EditorGroupDropSide;
  readonly groupId: string;
  readonly tabId: string;
}

export function resolveEditorGroupDropSide({
  point,
  rect,
}: ResolveEditorGroupDropSideOptions): EditorGroupDropSide {
  if (rect.width <= 0 || rect.height <= 0) {
    return 'right';
  }

  const edgeWidth = Math.min(Math.max(rect.width * 0.22, 96), rect.width / 3);
  const edgeHeight = Math.min(Math.max(rect.height * 0.22, 96), rect.height / 3);
  const candidates: Array<{ distance: number; side: EditorGroupDropSide }> = [];

  if (point.x < rect.left + edgeWidth) {
    candidates.push({ distance: Math.max(point.x - rect.left, 0), side: 'left' });
  }

  if (point.x > rect.right - edgeWidth) {
    candidates.push({ distance: Math.max(rect.right - point.x, 0), side: 'right' });
  }

  if (point.y < rect.top + edgeHeight) {
    candidates.push({ distance: Math.max(point.y - rect.top, 0), side: 'top' });
  }

  if (point.y > rect.bottom - edgeHeight) {
    candidates.push({ distance: Math.max(rect.bottom - point.y, 0), side: 'bottom' });
  }

  candidates.sort((left, right) => left.distance - right.distance);
  return candidates[0]?.side ?? 'center';
}

export function createEditorGroupDropMoveOptions({
  dropSide,
  groupId,
  tabId,
}: CreateEditorGroupDropMoveOptionsInput): MoveEditorOptions {
  if (dropSide === 'center') {
    return { groupId, tabId };
  }

  if (dropSide === 'left') {
    return { beforeGroupId: groupId, direction: 'horizontal', tabId };
  }

  if (dropSide === 'right') {
    return { afterGroupId: groupId, direction: 'horizontal', tabId };
  }

  if (dropSide === 'top') {
    return { beforeGroupId: groupId, direction: 'vertical', tabId };
  }

  return { afterGroupId: groupId, direction: 'vertical', tabId };
}
