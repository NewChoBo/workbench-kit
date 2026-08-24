/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { KeybindingCaptureField } from './KeybindingCaptureField';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

async function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    ...init,
  });
  await act(async () => {
    target.dispatchEvent(event);
  });
  return event;
}

describe('KeybindingCaptureField interactions', () => {
  it('distinguishes macOS Cmd from physical Ctrl and announces recording', async () => {
    const onChange = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<KeybindingCaptureField onChange={onChange} platform="mac" />);
      });
      const trigger = container.querySelector<HTMLButtonElement>('button');

      await act(async () => trigger?.click());
      expect(container.querySelector('[role="status"]')?.textContent).toContain(
        'Recording keyboard shortcut',
      );
      await press(window, 'k', { metaKey: true });
      expect(onChange).toHaveBeenLastCalledWith('meta+k');
      expect(document.activeElement).toBe(trigger);

      await act(async () => trigger?.click());
      await press(window, 'k', { ctrlKey: true });
      expect(onChange).toHaveBeenLastCalledWith('ctrl+k');
      expect(onChange).toHaveBeenCalledTimes(2);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('cancels on Escape, preserves native Tab, and ignores bare modifiers', async () => {
    const onCancel = vi.fn();
    const onChange = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <KeybindingCaptureField onCancel={onCancel} onChange={onChange} platform="windows" />,
        );
      });
      const trigger = container.querySelector<HTMLButtonElement>('button');

      await act(async () => trigger?.click());
      const modifierEvent = await press(window, 'Control', { ctrlKey: true });
      expect(modifierEvent.defaultPrevented).toBe(true);
      await press(window, 'Alt', { altKey: true });
      await press(window, 'Meta', { metaKey: true });
      await press(window, 'Shift', { shiftKey: true });
      expect(onChange).not.toHaveBeenCalled();
      expect(trigger?.textContent).toContain('Press shortcut');

      const escapeEvent = await press(window, 'Escape');
      expect(escapeEvent.defaultPrevented).toBe(true);
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(trigger);

      await act(async () => trigger?.click());
      const tabEvent = await press(trigger ?? window, 'Tab');
      expect(tabEvent.defaultPrevented).toBe(false);
      expect(onCancel).toHaveBeenCalledTimes(2);
      expect(trigger?.textContent).not.toContain('Press shortcut');

      await act(async () => trigger?.click());
      const shiftTabEvent = await press(trigger ?? window, 'Tab', { shiftKey: true });
      expect(shiftTabEvent.defaultPrevented).toBe(false);
      expect(onCancel).toHaveBeenCalledTimes(3);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it('uses Delete and Backspace as focused reset requests while recording', async () => {
    const onChange = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <KeybindingCaptureField onChange={onChange} platform="windows" value="ctrl+k" />,
        );
      });
      const trigger = container.querySelector<HTMLButtonElement>('button');

      await act(async () => trigger?.click());
      await press(window, 'Delete');
      expect(onChange).toHaveBeenLastCalledWith(undefined);
      expect(document.activeElement).toBe(trigger);

      await act(async () => trigger?.click());
      await press(window, 'Backspace');
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(document.activeElement).toBe(trigger);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
