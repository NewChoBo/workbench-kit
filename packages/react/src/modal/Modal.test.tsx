/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { Modal } from './Modal';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

describe('Modal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the legacy centered dialog without window controls by default', () => {
    const markup = renderToStaticMarkup(
      <Modal title="Basic" onClose={() => undefined}>
        Content
      </Modal>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).not.toContain('Maximize modal');
    expect(markup).not.toContain('data-draggable');
  });

  it('can render as a movable and maximizable workbench window', () => {
    const markup = renderToStaticMarkup(
      <Modal title="Settings" maximizable movable onClose={() => undefined}>
        Content
      </Modal>,
    );

    expect(markup).toContain('aria-label="Maximize modal"');
    expect(markup).toContain('codicon-chrome-maximize');
    expect(markup).toContain('data-draggable="true"');
  });

  it('can start maximized and expose the restore control', () => {
    const markup = renderToStaticMarkup(
      <Modal title="Settings" defaultMaximized maximizable movable onClose={() => undefined}>
        Content
      </Modal>,
    );

    expect(markup).toContain('data-maximized="true"');
    expect(markup).toContain('aria-label="Restore modal"');
    expect(markup).toContain('codicon-chrome-restore');
  });

  it('moves from titlebar drag and toggles maximize/restore', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <Modal title="Settings" maximizable movable onClose={() => undefined}>
          Content
        </Modal>,
      );
    });

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement | null;
    const titlebar = container.querySelector('.ui-modal__titlebar') as HTMLElement | null;
    expect(dialog).not.toBeNull();
    expect(titlebar).not.toBeNull();

    Object.defineProperty(dialog, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          bottom: 400,
          height: 300,
          left: 100,
          right: 500,
          top: 100,
          width: 400,
          x: 100,
          y: 100,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    await act(async () => {
      titlebar?.dispatchEvent(createPointerLikeEvent('pointerdown', 200, 120));
    });

    await act(async () => {
      window.dispatchEvent(createPointerLikeEvent('pointermove', 260, 160));
    });

    await act(async () => {
      window.dispatchEvent(createPointerLikeEvent('pointerup', 260, 160));
    });

    expect(dialog?.getAttribute('style')).toContain('translate3d(60px, 40px, 0)');

    const maximizeButton = container.querySelector(
      'button[aria-label="Maximize modal"]',
    ) as HTMLButtonElement | null;
    expect(maximizeButton).not.toBeNull();

    await act(async () => {
      maximizeButton?.click();
    });

    expect(dialog?.dataset.maximized).toBe('true');
    const restoreButton = container.querySelector(
      'button[aria-label="Restore modal"]',
    ) as HTMLButtonElement | null;
    expect(restoreButton).not.toBeNull();

    await act(async () => {
      restoreButton?.click();
    });

    expect(dialog?.dataset.maximized).toBeUndefined();

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
