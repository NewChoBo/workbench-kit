// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
let host: HTMLDivElement;
let mounted: Root;
function render(content: ReactNode) {
  host = document.createElement('div');
  document.body.append(host);
  mounted = createRoot(host);
  act(() => mounted.render(content));
  return { container: host };
}
const cleanup = () => {
  if (mounted) act(() => mounted.unmount());
  host?.remove();
};
const screen = {
  getByRole: (_role: string, { name }: { name: string }) =>
    host.querySelector<HTMLElement>(`[aria-label="${name}"]`)!,
  getByTestId: (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`)!,
};
const fireEvent = {
  click: (element: HTMLElement) =>
    act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true }))),
  keyDown: (element: HTMLElement, { key }: { key: string }) =>
    act(() => element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))),
};
import { layoutWidget } from '@workbench-kit/jdw';
import { renderCssLayoutTree } from './cssRenderBackend.js';
afterEach(cleanup);
it('places node controls within native scroll ancestry and selects only intended viewport', () => {
  const selected: string[] = [];
  const tree = layoutWidget(
    {
      id: 'root',
      type: 'stack',
      width: 300,
      height: 200,
      children: [
        {
          id: 'list',
          type: 'stack',
          left: 10,
          top: 10,
          width: 150,
          height: 90,
          children: [{ id: 'card', type: 'text', text: 'Card body', width: 120, height: 180 }],
        },
      ],
    },
    { minWidth: 0, minHeight: 0, maxWidth: 300, maxHeight: 200 },
  );
  render(
    <>
      {renderCssLayoutTree(tree, {
        nodeOverflow: (node) => (node.widget.id === 'list' ? 'auto' : 'hidden'),
        nodeSelection: (node) => ({
          elementId: `viewport-${node.widget.id}`,
          selected: node.widget.id === 'card',
          label: `Select ${node.widget.id}`,
          onSelect: () => selected.push(String(node.widget.id)),
        }),
        renderNodeOverlay: (node) => <span data-testid={`control-${node.widget.id}`}>Control</span>,
      })}
    </>,
  );
  const card = screen.getByRole('button', { name: 'Select card' }),
    list = screen.getByRole('button', { name: 'Select list' });
  const scroller = card.closest<HTMLElement>('[data-layout-scroll-viewport]')!;
  expect(scroller.parentElement).toBe(list);
  expect(scroller.style.overflow).toBe('auto');
  expect(screen.getByTestId('control-list').closest('[data-layout-scroll-viewport]')).toBeNull();
  expect(screen.getByTestId('control-card').closest('[data-layout-node-id]')).toBe(card);
  fireEvent.click(card);
  expect(selected).toEqual(['card']);
  fireEvent.keyDown(card, { key: 'Enter' });
  expect(selected).toEqual(['card', 'card']);
  expect(card.style.isolation).toBe('isolate');
  expect(card.id).toBe('viewport-card');
  expect(document.querySelectorAll('#viewport-card')).toHaveLength(1);
  expect(card.tabIndex).toBe(0);
  expect(list.tabIndex).toBe(-1);
});
it('leaves original default clipping and noninteractive rendering unchanged', () => {
  const tree = layoutWidget(
    { id: 'root', type: 'stack', width: 100, height: 100 },
    { minWidth: 0, minHeight: 0, maxWidth: 100, maxHeight: 100 },
  );
  const { container } = render(<>{renderCssLayoutTree(tree)}</>);
  expect(container.querySelector('[data-layout-scroll-viewport]')).toBeNull();
  expect(container.querySelector('[role=button]')).toBeNull();
  expect(container.querySelector<HTMLElement>('[data-layout-node]')!.style.isolation).toBe('');
});

it('combines explicit node overflow with root overflow into one native scroller', () => {
  const tree = layoutWidget(
    { id: 'root', type: 'stack', width: 100, height: 100 },
    { minWidth: 0, minHeight: 0, maxWidth: 100, maxHeight: 100 },
  );
  const { container } = render(
    <>{renderCssLayoutTree(tree, { rootOverflow: 'auto', nodeOverflow: () => 'auto' })}</>,
  );
  expect(container.querySelectorAll('[data-layout-scroll-viewport]')).toHaveLength(1);
  expect(container.querySelectorAll('[data-layout-scroll-root]')).toHaveLength(1);
  expect(container.querySelector<HTMLElement>('[data-layout-node]')!.style.overflow).toBe('hidden');
});

it('routes authored keyboard callbacks only to the focused node, never its ancestors', () => {
  const keys: string[] = [];
  const tree = layoutWidget(
    {
      id: 'root',
      type: 'stack',
      width: 300,
      height: 200,
      children: [
        {
          id: 'group',
          type: 'stack',
          width: 200,
          height: 100,
          children: [{ id: 'item', type: 'text', text: 'Item', width: 120, height: 150 }],
        },
      ],
    },
    { minWidth: 0, minHeight: 0, maxWidth: 300, maxHeight: 200 },
  );
  render(
    <>
      {renderCssLayoutTree(tree, {
        renderNodeOverlay: (n) => (
          <button data-testid={`inner-${n.widget.id}`}>Inner control</button>
        ),
        nodeOverflow: (n) => (n.widget.id === 'group' ? 'auto' : 'hidden'),
        nodeSelection: (n) => ({
          selected: n.widget.id === 'item',
          label: `Key ${n.widget.id}`,
          onSelect: () => {},
          onKeyDown: () => keys.push(String(n.widget.id)),
        }),
      })}
    </>,
  );
  const item = screen.getByRole('button', { name: 'Key item' });
  const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
  act(() => item.dispatchEvent(event));
  expect(keys).toEqual(['item']);
  expect(event.defaultPrevented).toBe(false);
  const inner = screen.getByTestId('inner-item');
  fireEvent.keyDown(inner, { key: 'Enter' });
  expect(keys).toEqual(['item']);
});
