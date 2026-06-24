/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appendChildrenPath, formatWidgetDocumentJson, ROOT_WIDGET_PATH } from '@workbench-kit/jdw';
import type { GenericWidget, WidgetPatch } from '@workbench-kit/jdw';

import { WidgetTreeCanvasPreview } from './WidgetTreeCanvasPreview.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('WidgetTreeCanvasPreview', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('emits linear resize patches for selected row children', async () => {
    const rootWidget: GenericWidget = {
      type: 'row',
      width: 300,
      height: 120,
      children: [
        { type: 'text', text: 'A', flex: 1, flexFit: 'tight' },
        { type: 'text', text: 'B', flex: 1 },
      ],
    };
    const selectedPath = appendChildrenPath(ROOT_WIDGET_PATH, 0);
    const onPatch = vi.fn((patch: WidgetPatch) => {
      void patch;
      return true;
    });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WidgetTreeCanvasPreview
          json={formatWidgetDocumentJson(rootWidget)}
          root={rootWidget}
          selectedPath={selectedPath}
          onPatch={onPatch}
          onSelectPath={() => undefined}
        />,
      );
    });

    const frame = container.querySelector('[data-testid="widget-tree-canvas-selection-frame"]');
    expect(frame?.getAttribute('data-widget-path')).toBe('$.children[0]');
    expect(frame?.getAttribute('data-widget-type')).toBe('text');
    expect(frame?.getAttribute('data-interactive')).toBe('true');

    const handle = container.querySelector(
      '[data-testid="widget-tree-canvas-resize-handle-se"]',
    ) as HTMLElement;
    Object.defineProperty(handle, 'setPointerCapture', {
      configurable: true,
      value: () => {
        throw new DOMException('No active pointer.', 'NotFoundError');
      },
    });
    Object.defineProperty(handle, 'hasPointerCapture', {
      configurable: true,
      value: () => false,
    });

    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointerdown', 150, 120));
    });
    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointermove', 120, 80));
    });
    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointerup', 120, 80));
    });

    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch.mock.calls[0]?.[0]).toMatchObject({
      type: 'replace-widget',
      path: ROOT_WIDGET_PATH,
      widget: {
        type: 'row',
        children: [
          { type: 'text', text: 'A', width: 120, height: 80, align: 'start' },
          { type: 'text', text: 'B', flex: 1 },
        ],
      },
    });

    await act(async () => {
      root.unmount();
    });
  });
});

function createPointerLikeEvent(type: string, clientX: number, clientY: number): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    cancelable: true,
    clientX,
    clientY,
  }) as PointerEvent;

  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event;
}
