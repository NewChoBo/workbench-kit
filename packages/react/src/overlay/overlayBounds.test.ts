/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { measureAnchoredOverlayPanel } from './measureAnchoredOverlayPanel';
import { measureOverlayPosition as measureSelect } from '../primitives/select/overlay';
import { measureOverlayPosition as measureMultiSelect } from '../primitives/searchable-multi-select/overlay';
import { readOverlayBounds } from './overlayBounds';

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}
function fixture(triggerRect: DOMRect, height = 400) {
  const owner = document.createElement('div');
  owner.dataset.workbenchPresentation = 'canvas';
  owner.getBoundingClientRect = () => rect(40, 120, 720, height);
  const pane = document.createElement('div');
  pane.dataset.workbenchSplitOverlayScope = '';
  pane.getBoundingClientRect = () => rect(40, 120, 200, height);
  const trigger = document.createElement('button');
  trigger.getBoundingClientRect = () => triggerRect;
  owner.append(pane);
  pane.append(trigger);
  document.body.append(owner);
  return { owner, trigger };
}
afterEach(() => {
  document.body.replaceChildren();
});

describe('owned overlay placement bounds', () => {
  it('uses the enclosing presentation instead of the pane clipping rectangle', () => {
    const { trigger } = fixture(rect(50, 140, 120, 28));
    expect(readOverlayBounds(trigger)).toMatchObject({
      left: 40,
      top: 120,
      right: 760,
      bottom: 520,
      width: 720,
      scoped: true,
    });
  });
  for (const [name, measure] of [
    ['select', measureSelect],
    ['multi-select', measureMultiSelect],
  ] as const) {
    it.each([rect(730, 130, 120, 28), rect(730, 190, 120, 28)])(
      `keeps ${name} above/below and right-edge placement inside content below the header`,
      (triggerRect) => {
        const { trigger } = fixture(triggerRect, 100);
        const result = measure(trigger, 20)!;
        const gap = name === 'multi-select' ? 2 : 0;
        const top =
          result.placement === 'top'
            ? result.triggerTop - gap - result.maxHeight
            : result.triggerBottom + gap;
        expect(result.left).toBeGreaterThanOrEqual(48);
        expect(result.left + result.width).toBeLessThanOrEqual(752);
        expect(top).toBeGreaterThanOrEqual(128);
        expect(top + result.maxHeight).toBeLessThanOrEqual(212);
      },
    );
  }
  it.each([rect(50, 124, 120, 28), rect(730, 130, 120, 28), rect(730, 490, 120, 28)])(
    'keeps anchored side/below/above panels inside presentation content',
    (triggerRect) => {
      const { trigger } = fixture(triggerRect);
      const result = measureAnchoredOverlayPanel(trigger);
      expect(result.left).toBeGreaterThanOrEqual(48);
      expect(result.left + result.width).toBeLessThanOrEqual(752);
      expect(result.top).toBeGreaterThanOrEqual(128);
      expect(result.top + result.maxHeight).toBeLessThanOrEqual(512);
    },
  );
  it('uses the opted-in standalone split root and retains legacy viewport fallback', () => {
    const { owner, trigger } = fixture(rect(50, 140, 120, 28));
    owner.removeAttribute('data-workbench-presentation');
    expect(readOverlayBounds(trigger)).toMatchObject({ width: 200, top: 120, scoped: true });
    trigger.parentElement!.removeAttribute('data-workbench-split-overlay-scope');
    expect(readOverlayBounds(trigger)).toMatchObject({
      width: window.innerWidth,
      top: 0,
      scoped: false,
    });
  });
});
