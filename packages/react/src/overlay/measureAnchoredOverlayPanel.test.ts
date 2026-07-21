/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { measureAnchoredOverlayPanel } from './measureAnchoredOverlayPanel';

function stubViewport(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

function stubTriggerRect(
  trigger: HTMLElement,
  rect: Pick<DOMRect, 'top' | 'left' | 'bottom' | 'right' | 'width' | 'height'>,
): void {
  Object.defineProperty(trigger, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: rect.left,
      y: rect.top,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      toJSON: () => ({}),
    }),
  });
}

describe('measureAnchoredOverlayPanel', () => {
  let trigger: HTMLElement;

  beforeEach(() => {
    stubViewport(1000, 800);
    trigger = document.createElement('button');
    document.body.append(trigger);
  });

  afterEach(() => {
    trigger.remove();
  });

  it('prefers side placement when the trigger is left-biased and spaceRight fits', () => {
    stubTriggerRect(trigger, {
      top: 120,
      left: 40,
      bottom: 152,
      right: 120,
      width: 80,
      height: 32,
    });

    const result = measureAnchoredOverlayPanel(trigger);

    expect(result.placement).toBe('side');
    expect(result.left).toBe(126); // right + 6
    expect(result.top).toBe(120);
    expect(result.width).toBe(360);
    expect(result.maxHeight).toBe(Math.min(800 * 0.72, 800 - 16));
  });

  it('places below when side is unavailable and spaceBelow wins', () => {
    stubTriggerRect(trigger, {
      top: 100,
      left: 500,
      bottom: 132,
      right: 580,
      width: 80,
      height: 32,
    });

    const result = measureAnchoredOverlayPanel(trigger);

    expect(result.placement).toBe('below');
    expect(result.top).toBe(138); // bottom + 6
    // Panel right aligns toward trigger right: 580 - 360 = 220
    expect(result.left).toBe(220);
  });

  it('places above when spaceBelow is tight and spaceAbove is larger', () => {
    // spaceBelow < 12 and < spaceAbove (trigger near the bottom edge).
    stubTriggerRect(trigger, {
      top: 763,
      left: 500,
      bottom: 795,
      right: 580,
      width: 80,
      height: 32,
    });

    const result = measureAnchoredOverlayPanel(trigger);
    const maxHeight = Math.min(800 * 0.72, 800 - 16);
    const spaceAbove = 763 - 8;
    const aboveHeight = Math.min(maxHeight, spaceAbove);

    expect(result.placement).toBe('above');
    expect(result.top).toBe(763 - 6 - aboveHeight);
    expect(result.left).toBe(220);
  });

  it('clamps width and left into the viewport', () => {
    stubViewport(320, 600);
    stubTriggerRect(trigger, {
      top: 40,
      left: 200,
      bottom: 72,
      right: 300,
      width: 100,
      height: 32,
    });

    const result = measureAnchoredOverlayPanel(trigger);
    const expectedWidth = Math.min(360, 320 - 16);

    expect(result.width).toBe(expectedWidth);
    expect(result.left).toBeGreaterThanOrEqual(8);
    expect(result.left + result.width).toBeLessThanOrEqual(320 - 8);
  });

  it('clamps side top using a minimum visible height', () => {
    stubTriggerRect(trigger, {
      top: 700,
      left: 40,
      bottom: 732,
      right: 120,
      width: 80,
      height: 32,
    });

    const result = measureAnchoredOverlayPanel(trigger);
    const maxHeight = Math.min(800 * 0.72, 800 - 16);
    const minVisible = Math.min(240, maxHeight);

    expect(result.placement).toBe('side');
    expect(result.top).toBe(800 - 8 - minVisible);
  });
});
