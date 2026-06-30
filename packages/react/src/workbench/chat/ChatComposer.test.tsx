/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatComposer } from './ChatComposer';

const testGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
testGlobal.IS_REACT_ACT_ENVIRONMENT = true;

const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;

describe('ChatComposer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(Date.now()), 16) as unknown as number;
    window.cancelAnimationFrame = (handle) => {
      window.clearTimeout(handle);
    };
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    vi.useRealTimers();
  });

  it('returns focus to the composer after opening commands', async () => {
    const onCommandClick = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ChatComposer
          commandLabel="Open commands"
          value=""
          onCommandClick={onCommandClick}
          onSubmit={() => undefined}
          onValueChange={() => undefined}
        />,
      );
    });

    const commandButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open commands"]',
    );
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');

    await act(async () => {
      commandButton?.click();
      vi.advanceTimersByTime(16);
    });

    expect(onCommandClick).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(textarea);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
