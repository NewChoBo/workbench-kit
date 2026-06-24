/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WidgetPlacementAsset } from '@workbench-kit/contracts';
import {
  appendBoxChildPath,
  appendChildrenPath,
  formatWidgetDocumentJson,
  ROOT_WIDGET_PATH,
} from '@workbench-kit/jdw';
import type { GenericWidget, WidgetPatch } from '@workbench-kit/jdw';

import { WidgetTreeCanvasPreview } from './WidgetTreeCanvasPreview.js';
import { writeWidgetPlacementAssetDragData } from './widget-placement-asset-dnd.js';

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
    mockPointerCapture(handle);

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

  it('emits fixed-size resize patches for selected wrapper children', async () => {
    const rootWidget: GenericWidget = {
      type: 'center',
      width: 200,
      height: 120,
      child: { type: 'text', text: 'Wrapped', width: 100, height: 60 },
    };
    const selectedPath = appendBoxChildPath(ROOT_WIDGET_PATH);
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
    expect(frame?.getAttribute('data-widget-path')).toBe('$.child');
    expect(frame?.getAttribute('data-widget-type')).toBe('text');
    expect(frame?.getAttribute('data-interactive')).toBe('true');

    const handle = container.querySelector(
      '[data-testid="widget-tree-canvas-resize-handle-se"]',
    ) as HTMLElement;
    mockPointerCapture(handle);

    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointerdown', 150, 90));
    });
    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointermove', 170, 100));
    });
    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointerup', 170, 100));
    });

    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch.mock.calls[0]?.[0]).toMatchObject({
      type: 'replace-widget',
      path: appendBoxChildPath(ROOT_WIDGET_PATH),
      widget: { type: 'text', text: 'Wrapped', width: 120, height: 70 },
    });

    await act(async () => {
      root.unmount();
    });
  });

  it('resolves palette asset drops against preview hit-test containers', async () => {
    const rootWidget: GenericWidget = {
      type: 'column',
      width: 240,
      height: 160,
      children: [{ type: 'text', text: 'A', height: 40 }],
    };
    const asset: WidgetPlacementAsset<GenericWidget> = {
      category: 'content',
      content: { type: 'text', text: 'Heading' },
      id: 'content.heading',
      label: 'Heading',
    };
    const onPatch = vi.fn((patch: WidgetPatch) => {
      void patch;
      return true;
    });
    const onPlaceAssetPath = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WidgetTreeCanvasPreview
          json={formatWidgetDocumentJson(rootWidget)}
          root={rootWidget}
          selectedPath={appendChildrenPath(ROOT_WIDGET_PATH, 0)}
          onPatch={onPatch}
          onPlaceAssetPath={onPlaceAssetPath}
          onSelectPath={() => undefined}
        />,
      );
    });

    const stage = container.querySelector(
      '[data-testid="widget-tree-canvas-stage"]',
    ) as HTMLElement;
    mockElementRect(stage, { left: 0, top: 0, width: 240, height: 160 });
    const dataTransfer = createDataTransfer();
    writeWidgetPlacementAssetDragData(dataTransfer, asset);

    await act(async () => {
      stage.dispatchEvent(createDragLikeEvent('dragover', 12, 12, dataTransfer));
    });

    const indicator = container.querySelector(
      '[data-testid="widget-tree-canvas-asset-drop-indicator"]',
    );
    expect(indicator?.getAttribute('data-widget-path')).toBe('$');

    await act(async () => {
      stage.dispatchEvent(createDragLikeEvent('drop', 12, 12, dataTransfer));
    });

    expect(onPlaceAssetPath).toHaveBeenCalledTimes(1);
    expect(onPlaceAssetPath.mock.calls[0]?.[0]).toMatchObject({
      asset,
      parentPath: ROOT_WIDGET_PATH,
      insertIndex: 1,
      nextPath: appendChildrenPath(ROOT_WIDGET_PATH, 1),
    });
    expect(onPatch).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });
});

function mockPointerCapture(handle: HTMLElement): void {
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
}

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

function mockElementRect(
  element: HTMLElement,
  rect: Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>,
): void {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        bottom: rect.top + rect.height,
        height: rect.height,
        left: rect.left,
        right: rect.left + rect.width,
        top: rect.top,
        width: rect.width,
        x: rect.left,
        y: rect.top,
        toJSON: () => ({}),
      }) as DOMRect,
  });
}

function createDragLikeEvent(
  type: string,
  clientX: number,
  clientY: number,
  dataTransfer: DataTransfer,
): DragEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  }) as DragEvent;

  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  return event;
}

function createDataTransfer(): DataTransfer {
  if (typeof DataTransfer !== 'undefined') {
    return new DataTransfer();
  }

  const store = new Map<string, string>();
  return {
    clearData: (format?: string) => {
      if (format) store.delete(format);
      else store.clear();
    },
    dropEffect: 'none',
    effectAllowed: 'none',
    files: [] as unknown as FileList,
    getData: (format: string) => store.get(format) ?? '',
    items: [] as unknown as DataTransferItemList,
    setDragImage: () => undefined,
    setData: (format: string, data: string) => {
      store.set(format, data);
    },
    types: [],
  } as unknown as DataTransfer;
}
