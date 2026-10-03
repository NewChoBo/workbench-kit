// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { revealCssLayoutNode } from './revealCssLayoutNode.js';

describe('bounded renderer reveal', () => {
  it('reveals through only marked ancestors inside the supplied root', () => {
    const outer = document.createElement('div'),
      root = document.createElement('div'),
      scroll = document.createElement('div'),
      target = document.createElement('div');
    document.body.append(outer);
    outer.append(root);
    root.append(scroll);
    scroll.append(target);
    outer.dataset.layoutScrollViewport = 'true';
    scroll.dataset.layoutScrollViewport = 'true';
    target.dataset.layoutNodeId = 'item';
    Object.defineProperties(scroll, { clientWidth: { value: 100 }, clientHeight: { value: 80 } });
    scroll.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      right: 110,
      bottom: 100,
      width: 100,
      height: 80,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });
    target.getBoundingClientRect = () => ({
      left: 90,
      top: 90,
      right: 140,
      bottom: 130,
      width: 50,
      height: 40,
      x: 90,
      y: 90,
      toJSON: () => ({}),
    });
    expect(revealCssLayoutNode(root, 'item')).toBe(true);
    expect(scroll.scrollLeft).toBe(30);
    expect(scroll.scrollTop).toBe(30);
    expect(outer.scrollLeft).toBe(0);
    expect(outer.scrollTop).toBe(0);
    expect(revealCssLayoutNode(root, 'missing')).toBe(false);
    outer.remove();
  });
});
