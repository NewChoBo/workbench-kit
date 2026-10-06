/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EditorTabs } from './WorkbenchEditor';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});
function mount() {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const onClose = vi.fn();
  const onSelect = vi.fn();
  const childKey = vi.fn();
  act(() =>
    root!.render(
      <EditorTabs
        activeId="second"
        onClose={onClose}
        onSelect={onSelect}
        tabs={[
          { id: 'first', label: 'First' },
          {
            id: 'second',
            label: (
              <>
                <span>Second</span>
                <input aria-label="Rename" onKeyDown={childKey} />
                <button onKeyDown={childKey} onClick={(event) => event.stopPropagation()}>
                  Child action
                </button>
              </>
            ),
          },
        ]}
      />,
    ),
  );
  return {
    onClose,
    onSelect,
    childKey,
    tab: container.querySelectorAll<HTMLElement>('[role="tab"]')[1]!,
  };
}
function key(target: HTMLElement, value: string) {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true });
  act(() => target.dispatchEvent(event));
  return event;
}
describe('EditorTabs keyboard event ownership', () => {
  it.each(['Enter', ' '])('preserves tab-self %j activation and active-only tab stops', (value) => {
    const { tab, onSelect, onClose } = mount();
    tab.focus();
    expect(key(tab, value).defaultPrevented).toBe(true);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('second');
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(tab);
    expect(
      Array.from(container.querySelectorAll('[role="tab"]'), (el) => el.getAttribute('tabindex')),
    ).toEqual(['-1', '0']);
  });
  it.each(['Enter', ' '])(
    'leaves nested close-button %j default activation to the browser',
    (value) => {
      const { tab, onSelect, onClose } = mount();
      const close = tab.querySelector<HTMLButtonElement>('[aria-label="Close tab"]')!;
      close.focus();
      expect(key(close, value).defaultPrevented).toBe(false);
      expect(onSelect).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(close);
    },
  );
  it.each(['Enter', ' '])('leaves input and child-control %j events with their owner', (value) => {
    const { tab, onSelect, childKey } = mount();
    for (const child of [
      tab.querySelector<HTMLInputElement>('input')!,
      tab.querySelector<HTMLButtonElement>('button:not([aria-label])')!,
    ]) {
      child.focus();
      expect(key(child, value).defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(child);
    }
    expect(childKey).toHaveBeenCalledTimes(2);
    expect(onSelect).not.toHaveBeenCalled();
  });
  it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])(
    'does not capture %s or introduce an arrow-focus contract',
    (value) => {
      const { tab, onSelect, onClose } = mount();
      tab.focus();
      expect(key(tab, value).defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(tab);
      expect(onSelect).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    },
  );
  it('preserves pointer selection and close-button propagation boundaries', () => {
    const { tab, onSelect, onClose } = mount();
    act(() => tab.click());
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('second');
    onSelect.mockClear();
    act(() => tab.querySelector<HTMLButtonElement>('[aria-label="Close tab"]')!.click());
    expect(onClose).toHaveBeenCalledExactlyOnceWith('second');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
