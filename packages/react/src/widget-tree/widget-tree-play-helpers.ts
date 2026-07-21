import { expect, waitFor } from 'storybook/test';

function resolveWidgetTreeSurface(root: ParentNode | Element | null): Element | null {
  if (!root || !(root instanceof Element)) {
    return null;
  }

  const testId = root.getAttribute('data-testid');
  if (
    testId === 'widget-tree-lab' ||
    testId === 'widget-tree-workbench' ||
    testId === 'widget-tree-source'
  ) {
    return root;
  }

  if (root.matches('.widget-tree-source .ui-json-code-editor-pane')) {
    return root;
  }

  return (
    root.querySelector('[data-testid="widget-tree-lab"]') ??
    root.querySelector('[data-testid="widget-tree-workbench"]') ??
    root.querySelector('.widget-tree-source .ui-json-code-editor-pane') ??
    root.querySelector('[data-testid="widget-tree-source"]')
  );
}

/** Wait until Widget Tree Lab / Workbench chrome is mounted (Form or Code surface). */
export async function waitForWidgetTreeSourcePane(canvasElement: HTMLElement): Promise<void> {
  const doc = canvasElement.ownerDocument ?? document;

  await waitFor(
    () => {
      const surface = resolveWidgetTreeSurface(canvasElement) ?? resolveWidgetTreeSurface(doc.body);
      expect(surface).toBeTruthy();
    },
    { timeout: 60_000 },
  );
}

/**
 * Match WidgetTreeCanvasPreview unit tests: synthetic pointers have no active
 * capture target, so setPointerCapture throws NotFoundError (swallowed by canvas).
 */
export function mockPointerCapture(handle: HTMLElement): void {
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

export function createPointerLikeEvent(
  type: string,
  clientX: number,
  clientY: number,
  pointerId = 1,
): PointerEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    cancelable: true,
    clientX,
    clientY,
  }) as PointerEvent;
  Object.defineProperty(event, 'pointerId', { configurable: true, value: pointerId });
  return event;
}

export function dispatchCanvasPointer(
  handle: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  clientY: number,
  pointerId = 1,
): void {
  handle.dispatchEvent(createPointerLikeEvent(type, clientX, clientY, pointerId));
}
