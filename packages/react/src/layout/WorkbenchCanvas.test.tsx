/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkbenchCanvasFrameHandle, WorkbenchCanvasResizeHandle } from './WorkbenchCanvas.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('WorkbenchCanvasFrameHandle', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('commits drag deltas when synthetic pointer capture is unavailable', async () => {
    const onDragEnd = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<WorkbenchCanvasFrameHandle label="text" onDragEnd={onDragEnd} />);
    });

    const handle = container.querySelector('.ui-workbench-canvas-frame-handle') as HTMLElement;
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
      handle.dispatchEvent(createPointerLikeEvent('pointerdown', 20, 20));
    });
    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointermove', 32, 29));
    });
    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointerup', 32, 29));
    });

    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onDragEnd.mock.calls[0]?.[0]).toBe(12);
    expect(onDragEnd.mock.calls[0]?.[1]).toBe(9);

    await act(async () => {
      root.unmount();
    });
  });

  it('commits resize deltas when synthetic pointer capture is unavailable', async () => {
    const onResizeEnd = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkbenchCanvasResizeHandle label="Resize selected widget" onResizeEnd={onResizeEnd} />,
      );
    });

    const handle = container.querySelector('.ui-workbench-canvas-resize-handle') as HTMLElement;
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
      handle.dispatchEvent(createPointerLikeEvent('pointerdown', 40, 40));
    });
    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointermove', 55, 52));
    });
    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointerup', 55, 52));
    });

    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    expect(onResizeEnd.mock.calls[0]?.[0]).toBe(15);
    expect(onResizeEnd.mock.calls[0]?.[1]).toBe(12);

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
