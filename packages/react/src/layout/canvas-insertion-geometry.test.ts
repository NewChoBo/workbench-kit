import { describe, expect, it } from 'vitest';
import {
  resolveWorkbenchCanvasInsertion,
  type WorkbenchCanvasInsertionInput,
  type WorkbenchCanvasInsertionRect,
} from './canvas-insertion-geometry';

const rect = (x: number, y: number, width = 40, height = 30): WorkbenchCanvasInsertionRect => ({
  x,
  y,
  width,
  height,
});
const base: WorkbenchCanvasInsertionInput = {
  point: { x: 100, y: 80 },
  parentRect: rect(20, 30, 300, 200),
  parentSize: { width: 300, height: 200 },
  scrollOffset: { x: 0, y: 0 },
  mode: 'canvas',
  children: [],
  childCount: 0,
  itemSize: { width: 40, height: 30 },
};

function resolve(overrides: Partial<WorkbenchCanvasInsertionInput> = {}) {
  return resolveWorkbenchCanvasInsertion({ ...base, ...overrides });
}

function ordered(mode: 'horizontal' | 'vertical' | 'grid', point: { x: number; y: number }) {
  const children =
    mode === 'horizontal'
      ? [rect(20, 40), rect(80, 40), rect(140, 40)]
      : mode === 'vertical'
        ? [rect(30, 30), rect(30, 80), rect(30, 130)]
        : [rect(20, 30), rect(80, 30), rect(20, 90), rect(80, 90)];
  return resolve({
    mode,
    point,
    childCount: children.length,
    children: children.map((child, index) => ({ index, rect: child })),
  });
}

describe('resolveWorkbenchCanvasInsertion', () => {
  it('uses parent-local top-left coordinates and appends canvas children', () => {
    expect(resolve({ children: [{ index: 0, rect: rect(30, 40) }], childCount: 1 })).toEqual({
      index: 1,
      position: { x: 80, y: 50 },
      markerRect: rect(80, 50),
    });
  });

  it('converts scale before adding own unscaled scroll exactly once', () => {
    expect(
      resolve({
        point: { x: 80, y: 60 },
        parentRect: rect(20, 30, 150, 100),
        scrollOffset: { x: 30, y: 15 },
      }),
    ).toEqual({ index: 0, position: { x: 150, y: 75 }, markerRect: rect(120, 60) });
  });

  it('uses current resolved proportional size rather than a nominal placement size', () => {
    expect(
      resolve({
        point: { x: 170, y: 100 },
        parentRect: rect(20, 30, 300, 200),
        parentSize: { width: 150, height: 100 },
      })?.position,
    ).toEqual({ x: 75, y: 35 });
  });

  it('rounds position and clamps to whole-pixel bounds, preserving item size', () => {
    expect(
      resolve({
        point: { x: 320, y: 230 },
        parentSize: { width: 300.8, height: 200.8 },
        itemSize: { width: 40.4, height: 30.4 },
      }),
    ).toEqual({
      index: 0,
      position: { x: 260, y: 170 },
      markerRect: rect(260, 170, 40.4, 30.4),
    });
    expect(resolve({ point: { x: 20.6, y: 30.4 } })?.position).toEqual({ x: 1, y: 0 });
  });

  it('clamps oversized items to zero and clips their marker to the viewport', () => {
    expect(resolve({ itemSize: { width: 400, height: 250 } })).toEqual({
      index: 0,
      position: { x: 0, y: 0 },
      markerRect: rect(0, 0, 300, 200),
    });
    expect(
      resolve({ itemSize: { width: 400, height: 250 }, scrollOffset: { x: 20, y: 10 } })
        ?.markerRect,
    ).toEqual(rect(0, 0, 300, 200));
  });

  it('takes an already-normalized content box and rejects gutters or surrounding CSS chrome', () => {
    // Host normalization removed scaled border/padding and the scrollbar gutter.
    const parentRect = rect(40, 50, 240, 160);
    const parentSize = { width: 120, height: 80 };
    expect(resolve({ parentRect, parentSize, point: { x: 60, y: 70 } })?.position).toEqual({
      x: 10,
      y: 10,
    });
    expect(resolve({ parentRect, parentSize, point: { x: 39, y: 70 } })).toBeNull();
    expect(resolve({ parentRect, parentSize, point: { x: 281, y: 70 } })).toBeNull();
    expect(resolve({ parentRect, parentSize, point: { x: 60, y: 211 } })).toBeNull();
  });

  it.each(['horizontal', 'vertical', 'grid'] as const)('outlines an empty %s viewport', (mode) => {
    expect(resolve({ mode })).toEqual({ index: 0, markerRect: rect(0, 0, 300, 200) });
  });

  it('chooses horizontal before, middle and end indices, without placement rewrites', () => {
    expect(ordered('horizontal', { x: 25, y: 50 })).toEqual({
      index: 0,
      markerRect: rect(0, 10, 2, 30),
    });
    expect(ordered('horizontal', { x: 70, y: 50 })?.index).toBe(1);
    expect(ordered('horizontal', { x: 300, y: 50 })).toEqual({
      index: 3,
      markerRect: rect(160, 10, 2, 30),
    });
  });

  it('chooses vertical before, middle and end indices; exact midpoint goes after', () => {
    expect(ordered('vertical', { x: 40, y: 35 })).toEqual({
      index: 0,
      markerRect: rect(10, 0, 40, 2),
    });
    expect(ordered('vertical', { x: 40, y: 45 })?.index).toBe(1);
    expect(ordered('vertical', { x: 40, y: 200 })).toEqual({
      index: 3,
      markerRect: rect(10, 130, 40, 2),
    });
  });

  it('chooses grid nearest rectangles, row boundaries and stable source-order ties', () => {
    expect(ordered('grid', { x: 25, y: 35 })?.index).toBe(0);
    expect(ordered('grid', { x: 90, y: 50 })?.index).toBe(1);
    expect(ordered('grid', { x: 105, y: 50 })?.index).toBe(2);
    // Equal distance to the first and second rows selects the earlier source row.
    expect(ordered('grid', { x: 30, y: 75 })?.index).toBe(1);
    expect(ordered('grid', { x: 30, y: 76 })?.index).toBe(2);
    expect(ordered('grid', { x: 70, y: 40 })?.index).toBe(1);
    expect(ordered('grid', { x: 110, y: 150 })?.index).toBe(4);
  });

  it('does not add own scroll twice to measured ordered markers', () => {
    expect(
      resolve({
        mode: 'vertical',
        parentRect: rect(20, 30, 150, 100),
        parentSize: { width: 300, height: 200 },
        scrollOffset: { x: 10, y: 40 },
        point: { x: 40, y: 70 },
        childCount: 1,
        children: [{ index: 0, rect: rect(25, 60, 70, 20) }],
      }),
    ).toEqual({ index: 1, markerRect: rect(10, 100, 140, 4) });
  });

  it('clips insertion lines at viewport edges', () => {
    expect(
      resolve({
        mode: 'horizontal',
        point: { x: 320, y: 100 },
        childCount: 1,
        children: [{ index: 0, rect: rect(280, 10, 40, 100) }],
      }),
    ).toEqual({ index: 1, markerRect: rect(298, 0, 2, 80) });
  });

  it.each([
    { point: { x: NaN, y: 40 } },
    { parentRect: rect(0, 0, 0, 100) },
    { parentRect: rect(Infinity, 0, 100, 100) },
    { parentSize: { width: 0, height: 100 } },
    { parentSize: { width: 100, height: Infinity } },
    { scrollOffset: { x: 0, y: NaN } },
    { itemSize: { width: -1, height: 30 } },
    { itemSize: { width: 30, height: Infinity } },
    { childCount: 1 },
    { childCount: -1 },
    { childCount: 0.5 },
    { childCount: 1, children: [{ index: 1, rect: rect(20, 30) }] },
    { childCount: 1, children: [{ index: 0, rect: rect(20, 30, 0) }] },
    {
      childCount: 2,
      children: [
        { index: 0, rect: rect(20, 30) },
        { index: 0, rect: rect(60, 30) },
      ],
    },
  ])('rejects invalid or incomplete geometry %#', (overrides) => {
    expect(resolve(overrides)).toBeNull();
  });

  it('requires canvas extent and rejects unknown layout modes', () => {
    const { itemSize: _itemSize, ...withoutSize } = base;
    expect(resolveWorkbenchCanvasInsertion(withoutSize)).toBeNull();
    expect(resolve({ mode: 'unknown' as WorkbenchCanvasInsertionInput['mode'] })).toBeNull();
  });

  it('never mutates frozen input rectangles, source order or item dimensions', () => {
    const children = Object.freeze([
      Object.freeze({ index: 0, rect: Object.freeze(rect(20, 30)) }),
    ]);
    const input = Object.freeze({
      ...base,
      childCount: 1,
      children,
      itemSize: Object.freeze({ width: 40, height: 30 }),
    });
    const before = JSON.stringify(input);
    expect(resolveWorkbenchCanvasInsertion(input)?.index).toBe(1);
    expect(JSON.stringify(input)).toBe(before);
  });
});
