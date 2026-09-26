import type { KeyboardEvent, MouseEvent } from 'react';
import type { WidgetPath } from '@workbench-kit/jdw';

import { shouldAllowNativeBrowserContextMenu } from '../workbench/commands/workbenchContextMenu.js';

/** A surface requests actions; the controlled document owner resolves them. */
export interface WidgetContextActionRequest {
  readonly path: WidgetPath;
  readonly invoker: HTMLElement;
  readonly x: number;
  readonly y: number;
}

export function isWidgetContextKey(event: KeyboardEvent): boolean {
  return event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
}

export function requestWidgetContextActions(
  event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  path: WidgetPath,
  invoker: HTMLElement,
  onRequest: ((request: WidgetContextActionRequest) => void) | undefined,
) {
  if (!onRequest || shouldAllowNativeBrowserContextMenu(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = invoker.getBoundingClientRect();
  const pointer = 'clientX' in event && (event.clientX !== 0 || event.clientY !== 0);
  invoker.focus({ preventScroll: true });
  onRequest({
    path,
    invoker,
    x: pointer ? event.clientX : rect.left,
    y: pointer ? event.clientY : rect.bottom,
  });
}
