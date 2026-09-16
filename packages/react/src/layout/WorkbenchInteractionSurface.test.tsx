/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { WorkbenchInteractionSurface } from './WorkbenchInteractionSurface';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it('keeps consumer activation and content ownership for text and image surfaces without a timer', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const interval = vi.spyOn(globalThis, 'setInterval');
  const activate = vi.fn();
  try {
    for (const content of [
      <p key="text">Status detail</p>,
      <img key="image" src="data:," alt="Preview" />,
    ]) {
      await act(async () =>
        root.render(
          <WorkbenchInteractionSurface content={content} effect="lift" enabled={false}>
            <button onClick={activate}>Inspect</button>
          </WorkbenchInteractionSurface>,
        ),
      );
      await act(async () => container.querySelector('button')!.click());
      expect(container.querySelectorAll('button')).toHaveLength(1);
      expect(container.querySelector('[role="button"]')).toBeNull();
    }
    expect(activate).toHaveBeenCalledTimes(2);
    expect(interval).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    interval.mockRestore();
    container.remove();
  }
});
