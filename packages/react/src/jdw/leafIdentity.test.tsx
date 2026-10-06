// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createWidgetRegistry, layoutWidget } from '@workbench-kit/jdw';
import { renderCssLayoutTree } from './cssRenderBackend.js';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement;
let root: Root;
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
  vi.restoreAllMocks();
});

it.each([false, true])(
  'keeps registry leaf identity without key warnings (background=%s)',
  (background) => {
    const errors = vi.spyOn(console, 'error');
    function Leaf() {
      const [count, setCount] = useState(0);
      return <button onClick={() => setCount(count + 1)}>{count}</button>;
    }
    const registry = createWidgetRegistry([{ type: 'stateful-leaf', build: () => <Leaf /> }]);
    const tree = layoutWidget(
      { id: 'leaf', type: 'stateful-leaf', width: 100, height: 80 },
      { minWidth: 0, minHeight: 0, maxWidth: 100, maxHeight: 80 },
      { x: 0, y: 0 },
      { registry },
    );
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    let showBackground = background;
    const draw = () =>
      renderCssLayoutTree(tree, {
        registry,
        ...(showBackground ? { renderNodeBackground: () => <span>Decoration</span> } : {}),
      });
    act(() => root.render(draw()));
    const button = host.querySelector('button')!;
    act(() => button.click());
    act(() => root.render(draw()));
    expect(host.querySelector('button')).toBe(button);
    expect(button.textContent).toBe('1');
    for (const next of [!background, background]) {
      showBackground = next;
      act(() => root.render(draw()));
      expect(host.querySelector('button')).toBe(button);
      expect(button.textContent).toBe('1');
    }
    expect(errors).not.toHaveBeenCalled();
  },
);
