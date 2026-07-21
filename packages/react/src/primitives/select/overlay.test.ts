/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { measureOverlayPosition } from './overlay';

function mockTrigger(rect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width' | 'height'>) {
  const trigger = document.createElement('button');
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
    x: rect.left,
    y: rect.top,
    left: rect.left,
    top: rect.top,
    right: rect.left + rect.width,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    toJSON: () => ({}),
  });
  return trigger;
}

describe('measureOverlayPosition', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses full ideal height for short lists when space allows', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const trigger = mockTrigger({ top: 200, bottom: 228, left: 16, width: 320, height: 28 });

    const position = measureOverlayPosition(trigger, 2);

    expect(position).toEqual({
      placement: 'bottom',
      left: 16,
      width: 320,
      maxHeight: 56,
      triggerTop: 200,
      triggerBottom: 228,
    });
  });

  it('opens upward when space below is too small', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 260 });
    const trigger = mockTrigger({ top: 220, bottom: 248, left: 16, width: 320, height: 28 });

    const position = measureOverlayPosition(trigger, 2);

    expect(position?.placement).toBe('top');
    expect(position?.maxHeight).toBe(56);
  });

  it('keeps compact lists at full height even when viewport space is tight', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 120 });
    const trigger = mockTrigger({ top: 70, bottom: 98, left: 16, width: 320, height: 28 });

    const position = measureOverlayPosition(trigger, 2);

    expect(position?.maxHeight).toBe(56);
  });

  it('clamps height when the list cannot fully fit in the viewport', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 120 });
    const trigger = mockTrigger({ top: 80, bottom: 108, left: 16, width: 320, height: 28 });

    const position = measureOverlayPosition(trigger, 10);

    expect(position?.maxHeight).toBeLessThan(240);
    expect(position?.maxHeight).toBeGreaterThanOrEqual(36);
  });
});
