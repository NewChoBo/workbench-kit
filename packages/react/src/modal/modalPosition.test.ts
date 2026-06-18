/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clampModalBoundsPosition, clampModalDragPosition } from './modalPosition';

describe('clampModalDragPosition', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    });
  });

  it('keeps the titlebar inside the viewport while dragging', () => {
    expect(clampModalDragPosition({ x: 0, y: -40 }, { width: 400, height: 300 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('keeps horizontal edges flush with the viewport', () => {
    expect(clampModalDragPosition({ x: -120, y: 40 }, { width: 400, height: 300 })).toEqual({
      x: 0,
      y: 40,
    });
    expect(clampModalDragPosition({ x: 500, y: 40 }, { width: 400, height: 300 })).toEqual({
      x: 400,
      y: 40,
    });
  });

  it('keeps the full window inside the viewport while dragging', () => {
    expect(clampModalDragPosition({ x: 40, y: 400 }, { width: 400, height: 300 })).toEqual({
      x: 40,
      y: 300,
    });
  });

  it('keeps the full window inside the viewport on resize', () => {
    expect(clampModalBoundsPosition({ x: 40, y: 320, width: 400, height: 300 })).toEqual({
      x: 40,
      y: 300,
      width: 400,
      height: 300,
    });
  });
});
