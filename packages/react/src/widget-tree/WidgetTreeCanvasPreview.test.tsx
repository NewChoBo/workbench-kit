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

  it('shows drag ghost and snap guides while dragging a stack child', async () => {
    const rootWidget: GenericWidget = {
      type: 'stack',
      width: 200,
      height: 100,
      children: [
        {
          type: 'text',
          text: 'Dragged',
          left: 8,
          top: 8,
          right: 120,
          bottom: 60,
        },
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

    const handle = container.querySelector(
      '[data-testid="widget-tree-canvas-drag-handle"]',
    ) as HTMLElement;
    mockPointerCapture(handle);

    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointerdown', 20, 20));
    });
    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointermove', 36, 28));
    });

    const ghost = container.querySelector('[data-testid="widget-tree-canvas-drag-ghost"]');
    expect(ghost?.getAttribute('data-widget-path')).toBe('$.children[0]');
    expect(ghost?.getAttribute('data-widget-type')).toBe('text');
    expect(ghost?.getAttribute('data-delta-x')).toBe('16');
    expect(ghost?.getAttribute('data-delta-y')).toBe('8');
    expect(ghost?.getAttribute('data-patch-type')).toBe('replace-widget');
    expect(ghost?.getAttribute('style')).toContain(
      '--ui-workbench-canvas-drag-preview-frame-x: 24px',
    );
    expect(ghost?.getAttribute('style')).toContain(
      '--ui-workbench-canvas-drag-preview-frame-y: 16px',
    );

    const guideX = container.querySelector('[data-testid="widget-tree-canvas-snap-guide-x"]');
    const guideY = container.querySelector('[data-testid="widget-tree-canvas-snap-guide-y"]');
    expect(guideX?.getAttribute('data-axis')).toBe('x');
    expect(guideX?.getAttribute('data-widget-path')).toBe('$.children[0]');
    expect(guideY?.getAttribute('data-axis')).toBe('y');
    expect(guideY?.getAttribute('data-widget-path')).toBe('$.children[0]');
    expect(onPatch).not.toHaveBeenCalled();

    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointerup', 36, 28));
    });

    expect(onPatch).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });

  it('shows reparent target indicators while dragging into another container', async () => {
    const rootWidget: GenericWidget = {
      type: 'stack',
      width: 360,
      height: 180,
      children: [
        {
          type: 'text',
          text: 'Card',
          left: 8,
          top: 8,
          right: 252,
          bottom: 132,
        },
        {
          type: 'grid',
          columns: 2,
          gap: 8,
          left: 180,
          top: 8,
          right: 16,
          bottom: 16,
          children: [],
        },
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

    const handle = container.querySelector(
      '[data-testid="widget-tree-canvas-drag-handle"]',
    ) as HTMLElement;
    mockPointerCapture(handle);

    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointerdown', 20, 20));
    });
    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointermove', 180, 32));
    });

    const ghost = container.querySelector('[data-testid="widget-tree-canvas-drag-ghost"]');
    expect(ghost?.getAttribute('data-patch-type')).toBe('reparent-widget');

    const indicator = container.querySelector(
      '[data-testid="widget-tree-canvas-reparent-drop-indicator"]',
    );
    expect(indicator?.getAttribute('data-widget-path')).toBe('$.children[1]');
    expect(indicator?.getAttribute('data-parent-type')).toBe('grid');
    expect(indicator?.getAttribute('data-insert-index')).toBe('0');
    expect(indicator?.getAttribute('data-drop-target-type')).toBe('append-grid');

    const marker = container.querySelector(
      '[data-testid="widget-tree-canvas-reparent-drop-marker"]',
    );
    expect(marker?.getAttribute('data-widget-path')).toBe('$.children[1]');
    expect(marker?.getAttribute('data-parent-type')).toBe('grid');
    expect(marker?.getAttribute('data-drop-target-type')).toBe('append-grid');
    expect(onPatch).not.toHaveBeenCalled();

    await act(async () => {
      handle.dispatchEvent(createPointerLikeEvent('pointerup', 180, 32));
    });

    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch.mock.calls[0]?.[0]).toMatchObject({
      type: 'reparent-widget',
      fromPath: selectedPath,
      toParentPath: appendChildrenPath(ROOT_WIDGET_PATH, 1),
      insertIndex: 0,
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
    expect(indicator?.getAttribute('data-parent-type')).toBe('column');
    expect(indicator?.getAttribute('data-insert-index')).toBe('1');
    expect(indicator?.getAttribute('data-next-widget-path')).toBe('$.children[1]');

    const marker = container.querySelector('[data-testid="widget-tree-canvas-asset-drop-marker"]');
    expect(marker?.getAttribute('data-widget-path')).toBe('$');
    expect(marker?.getAttribute('data-parent-type')).toBe('column');
    expect(marker?.getAttribute('data-drop-target-type')).toBe('append-column');
    expect(marker?.getAttribute('data-next-widget-path')).toBe('$.children[1]');
    expect(marker?.getAttribute('style')).toContain('--ui-workbench-canvas-drop-indicator-y: 40px');
    expect(marker?.getAttribute('style')).toContain(
      '--ui-workbench-canvas-drop-indicator-height: 2px',
    );

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

  it('shows grid slot markers for preview asset drops', async () => {
    const rootWidget: GenericWidget = {
      type: 'grid',
      columns: 2,
      width: 200,
      height: 120,
      children: [{ type: 'text', text: 'A', col: 0, row: 0 }],
    };
    const asset: WidgetPlacementAsset<GenericWidget> = {
      category: 'content',
      content: { type: 'text', text: 'Heading' },
      id: 'content.heading',
      label: 'Heading',
    };
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
          onPatch={() => true}
          onPlaceAssetPath={onPlaceAssetPath}
          onSelectPath={() => undefined}
        />,
      );
    });

    const stage = container.querySelector(
      '[data-testid="widget-tree-canvas-stage"]',
    ) as HTMLElement;
    mockElementRect(stage, { left: 0, top: 0, width: 200, height: 120 });
    const dataTransfer = createDataTransfer();
    writeWidgetPlacementAssetDragData(dataTransfer, asset);

    await act(async () => {
      stage.dispatchEvent(createDragLikeEvent('dragover', 12, 12, dataTransfer));
    });

    const indicator = container.querySelector(
      '[data-testid="widget-tree-canvas-asset-drop-indicator"]',
    );
    const marker = container.querySelector('[data-testid="widget-tree-canvas-asset-drop-marker"]');
    expect(indicator?.getAttribute('data-parent-type')).toBe('grid');
    expect(indicator?.getAttribute('data-insert-index')).toBe('1');
    expect(indicator?.getAttribute('data-next-widget-path')).toBe('$.children[1]');
    expect(marker?.getAttribute('data-drop-target-type')).toBe('append-grid');
    expect(marker?.getAttribute('data-parent-type')).toBe('grid');
    expect(marker?.getAttribute('style')).toContain(
      '--ui-workbench-canvas-drop-indicator-x: 100px',
    );
    expect(marker?.getAttribute('style')).toContain(
      '--ui-workbench-canvas-drop-indicator-width: 100px',
    );

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

    await act(async () => {
      root.unmount();
    });
  });

  it('shows a transient hover frame for preview nodes without mutating JSON', async () => {
    const rootWidget: GenericWidget = {
      type: 'column',
      width: 240,
      height: 120,
      children: [
        { type: 'text', text: 'A', height: 40 },
        { type: 'text', text: 'B', height: 40 },
      ],
    };
    const onPatch = vi.fn((patch: WidgetPatch) => {
      void patch;
      return true;
    });
    const onSelectPath = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WidgetTreeCanvasPreview
          json={formatWidgetDocumentJson(rootWidget)}
          root={rootWidget}
          selectedPath={appendChildrenPath(ROOT_WIDGET_PATH, 1)}
          onPatch={onPatch}
          onSelectPath={onSelectPath}
        />,
      );
    });

    const previewChild = container.querySelector(
      '[data-widget-path="$.children[0]"][data-widget-type="text"]',
    ) as HTMLElement;
    expect(previewChild).toBeTruthy();

    await act(async () => {
      previewChild.dispatchEvent(createPointerLikeEvent('pointermove', 12, 12));
    });

    const hoverFrame = container.querySelector('[data-testid="widget-tree-canvas-hover-frame"]');
    expect(hoverFrame?.getAttribute('data-widget-path')).toBe('$.children[0]');
    expect(hoverFrame?.getAttribute('data-widget-type')).toBe('text');
    expect(hoverFrame?.getAttribute('data-hovered')).toBe('true');
    expect(hoverFrame?.getAttribute('data-transient')).toBe('true');
    expect(onPatch).not.toHaveBeenCalled();
    expect(onSelectPath).not.toHaveBeenCalled();

    const stage = container.querySelector(
      '[data-testid="widget-tree-canvas-stage"]',
    ) as HTMLElement;
    await act(async () => {
      stage.dispatchEvent(createPointerLikeEvent('pointerout', 260, 140));
    });

    expect(container.querySelector('[data-testid="widget-tree-canvas-hover-frame"]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });

  it('shows focus chrome for preview nodes and keeps keyboard activation on the select path', async () => {
    const rootWidget: GenericWidget = {
      type: 'column',
      width: 240,
      height: 120,
      children: [
        { type: 'text', text: 'A', height: 40 },
        { type: 'text', text: 'B', height: 40 },
      ],
    };
    const onPatch = vi.fn((patch: WidgetPatch) => {
      void patch;
      return true;
    });
    const onSelectPath = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WidgetTreeCanvasPreview
          json={formatWidgetDocumentJson(rootWidget)}
          root={rootWidget}
          selectedPath={appendChildrenPath(ROOT_WIDGET_PATH, 1)}
          onPatch={onPatch}
          onSelectPath={onSelectPath}
        />,
      );
    });

    const selectedPreviewChild = container.querySelector(
      '[data-widget-path="$.children[1]"][data-widget-type="text"]',
    ) as HTMLElement;
    const previewChild = container.querySelector(
      '[data-widget-path="$.children[0]"][data-widget-type="text"]',
    ) as HTMLElement;
    expect(selectedPreviewChild?.getAttribute('tabindex')).toBe('0');
    expect(previewChild?.getAttribute('tabindex')).toBe('-1');

    await act(async () => {
      previewChild.focus();
    });

    const focusFrame = container.querySelector('[data-testid="widget-tree-canvas-focus-frame"]');
    expect(document.activeElement).toBe(previewChild);
    expect(focusFrame?.getAttribute('data-widget-path')).toBe('$.children[0]');
    expect(focusFrame?.getAttribute('data-widget-type')).toBe('text');
    expect(focusFrame?.getAttribute('data-focused')).toBe('true');
    expect(focusFrame?.getAttribute('data-transient')).toBe('true');
    expect(onPatch).not.toHaveBeenCalled();
    expect(onSelectPath).not.toHaveBeenCalled();

    await act(async () => {
      previewChild.dispatchEvent(createKeyboardLikeEvent('keydown', 'Enter'));
    });

    expect(onSelectPath).toHaveBeenCalledTimes(1);
    expect(onSelectPath).toHaveBeenCalledWith(appendChildrenPath(ROOT_WIDGET_PATH, 0));
    expect(onPatch).not.toHaveBeenCalled();

    await act(async () => {
      previewChild.blur();
    });

    expect(container.querySelector('[data-testid="widget-tree-canvas-focus-frame"]')).toBeNull();

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

function createKeyboardLikeEvent(type: string, key: string): KeyboardEvent {
  return new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key,
  });
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
