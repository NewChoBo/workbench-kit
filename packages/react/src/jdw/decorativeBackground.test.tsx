// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { layoutWidget, type WidgetPath } from '@workbench-kit/jdw';

import { renderCssLayoutTree } from './cssRenderBackend.js';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let host: HTMLDivElement | undefined;
let mounted: Root | undefined;
function render(content: ReactNode): HTMLDivElement {
  host = document.createElement('div');
  document.body.append(host);
  mounted = createRoot(host);
  act(() => mounted!.render(content));
  return host;
}
afterEach(() => {
  if (mounted) act(() => mounted!.unmount());
  host?.remove();
  mounted = undefined;
  host = undefined;
});

function fixture() {
  return layoutWidget(
    {
      id: 'root',
      type: 'stack',
      width: 120,
      height: 90,
      children: [
        {
          id: 'group',
          type: 'stack',
          width: 100,
          height: 80,
          children: [{ id: 'body', type: 'text', text: 'Content', width: 90, height: 180 }],
        },
      ],
    },
    { minWidth: 0, minHeight: 0, maxWidth: 120, maxHeight: 90 },
  );
}

const find = (container: HTMLElement, selector: string) =>
  container.querySelector<HTMLElement>(selector)!;

describe('decorative node backgrounds', () => {
  it('paints pointer-free, hidden decoration before content without authored identity or layout', () => {
    const paths: WidgetPath[] = [];
    const tree = fixture();
    const originalRects = JSON.stringify(tree);
    const selected: string[] = [];
    const container = render(
      renderCssLayoutTree(tree, {
        renderNodeBackground: (node, path) => {
          paths.push(path);
          return <div data-decoration={node.widget.id} style={{ backgroundColor: '#123456' }} />;
        },
        nodeSelection: (node) => ({
          label: String(node.widget.id),
          selected: node.widget.id === 'body',
          onSelect: () => selected.push(String(node.widget.id)),
        }),
      }),
    );
    expect(paths).toEqual([
      [
        { kind: 'children', index: 0 },
        { kind: 'children', index: 0 },
      ],
      [{ kind: 'children', index: 0 }],
      [],
    ]);
    const group = find(container, '[data-layout-node-id="group"]');
    const background = find(group, ':scope > [data-layout-background]');
    expect(group.firstElementChild).toBe(background);
    expect(background.getAttribute('aria-hidden')).toBe('true');
    expect(background.hasAttribute('inert')).toBe(true);
    expect(background.getAttribute('tabindex')).toBeNull();
    expect(background.getAttribute('id')).toBeNull();
    expect(background.getAttribute('data-layout-node-id')).toBeNull();
    expect(background.getAttribute('data-widget-path')).toBeNull();
    expect(background.style.pointerEvents).toBe('none');
    expect(background.style.userSelect).toBe('none');
    expect(background.style.position).toBe('absolute');
    expect(background.style.inset).toBe('0px');
    expect(background.style.overflow).toBe('hidden');
    expect(background.style.zIndex).toBe('-1');
    expect(group.style.isolation).toBe('isolate');
    expect(container.querySelectorAll('[data-layout-node-id]')).toHaveLength(3);
    expect(JSON.stringify(tree)).toBe(originalRects);
    act(() => find(container, '[data-layout-node-id="body"]').click());
    expect(selected).toEqual(['body']);
  });

  it('keeps backgrounds and overlays outside nested native scrollers', () => {
    const container = render(
      renderCssLayoutTree(fixture(), {
        nodeOverflow: (node) => (node.widget.id === 'group' ? 'auto' : 'hidden'),
        renderNodeBackground: (node) => <div data-decoration={node.widget.id} />,
        renderNodeOverlay: (node) => <div data-control={node.widget.id} />,
      }),
    );
    const group = find(container, '[data-layout-node-id="group"]');
    const scroller = find(group, ':scope > [data-layout-scroll-viewport]');
    const background = find(group, ':scope > [data-layout-background]');
    const overlay = find(group, ':scope > [data-layout-overlay]');
    expect(scroller.parentElement).toBe(group);
    expect(background.closest('[data-layout-scroll-viewport]')).toBeNull();
    expect(overlay.closest('[data-layout-scroll-viewport]')).toBeNull();
    expect(
      find(group, '[data-layout-node-id="body"]').closest('[data-layout-scroll-viewport]'),
    ).toBe(scroller);
    expect(scroller.style.overflow).toBe('auto');
    expect(group.style.overflow).toBe('hidden');
    expect(overlay.style.zIndex).toBe('2');
    act(() => {
      scroller.scrollTop = 20;
      scroller.dispatchEvent(new Event('scroll'));
    });
    expect(background.style.inset).toBe('0px');
    expect(background.parentElement).toBe(group);
  });

  it.each([undefined, 'auto'] as const)(
    'uses one inner root scroller for opted-in background and nodeOverflow %s',
    (nodeOverflow) => {
      const tree = layoutWidget(
        { type: 'stack', id: 'root', width: 100, height: 80 },
        { minWidth: 0, minHeight: 0, maxWidth: 100, maxHeight: 80 },
      );
      const container = render(
        renderCssLayoutTree(tree, {
          rootOverflow: 'auto',
          ...(nodeOverflow ? { nodeOverflow: () => nodeOverflow } : {}),
          renderNodeBackground: () => <div data-decoration="root" />,
        }),
      );
      const root = find(container, '[data-layout-node-id="root"]');
      expect(root.style.overflow).toBe('hidden');
      expect(container.querySelectorAll('[data-layout-scroll-root]')).toHaveLength(1);
      expect(container.querySelectorAll('[data-layout-scroll-viewport]')).toHaveLength(1);
      const background = find(root, '[data-layout-background]');
      expect(background.closest('[data-layout-scroll-viewport]')).toBeNull();
      expect(find(root, '[data-layout-scroll-root]').parentElement).toBe(root);
    },
  );

  it('does not apply image opacity to fallback color or content', () => {
    const container = render(
      renderCssLayoutTree(fixture(), {
        renderNodeBackground: () => (
          <div
            data-color="true"
            style={{ backgroundColor: '#123456', position: 'absolute', inset: 0 }}
          >
            <div data-image="true" style={{ opacity: 0.25, position: 'absolute', inset: 0 }} />
          </div>
        ),
      }),
    );
    expect(find(container, '[data-image]').style.opacity).toBe('0.25');
    expect(find(container, '[data-color]').style.opacity).toBe('');
    expect(find(container, '[data-layout-background]').style.opacity).toBe('');
    expect(find(container, '[data-layout-node-id="body"]').style.opacity).toBe('');
    expect(container.textContent).toContain('Content');
  });

  it('keeps legacy clipping, scrolling and markup routes unchanged without the callback', () => {
    const container = render(renderCssLayoutTree(fixture(), { rootOverflow: 'auto' }));
    const root = find(container, '[data-layout-node-id="root"]');
    expect(container.querySelector('[data-layout-background]')).toBeNull();
    expect(root.style.isolation).toBe('');
    expect(root.style.overflow).toBe('auto');
    expect(root.getAttribute('data-layout-scroll-root')).toBe('true');
    expect(container.querySelectorAll('[data-layout-scroll-viewport]')).toHaveLength(1);
  });
});
