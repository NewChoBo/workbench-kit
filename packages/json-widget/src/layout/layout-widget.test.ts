import { describe, expect, it } from 'vitest';

import type { GenericWidget } from '../widget/tree.js';
import { createWidgetRegistry } from '../widget/registry.js';
import { layoutWidget } from './layout-widget.js';
import { estimateWrappedTextSize } from './text-metrics.js';

describe('layoutWidget', () => {
  it('lays out row children with flex weights', () => {
    const widget: GenericWidget = {
      type: 'row',
      gap: 8,
      padding: 0,
      children: [
        { type: 'text', text: 'A', flex: 1 },
        { type: 'text', text: 'B', flex: 2 },
      ],
    };

    const result = layoutWidget(widget, {
      minWidth: 0,
      maxWidth: 300,
      minHeight: 0,
      maxHeight: 100,
    });

    expect(result.children).toHaveLength(2);
    expect(result.children[0]?.rect.width).toBeCloseTo(292 / 3, 0);
    expect(result.children[1]?.rect.width).toBeCloseTo((292 / 3) * 2, 0);
  });

  it('lays out grid children using col and row placement', () => {
    const widget: GenericWidget = {
      type: 'grid',
      columns: 2,
      gap: 0,
      padding: 0,
      children: [
        { type: 'text', text: 'A', col: 0, row: 0 },
        { type: 'text', text: 'B', col: 1, row: 0 },
        { type: 'text', text: 'Wide', col: 0, row: 1, colSpan: 2 },
      ],
    };

    const result = layoutWidget(widget, {
      minWidth: 0,
      maxWidth: 200,
      minHeight: 0,
      maxHeight: 200,
    });

    expect(result.children[2]?.rect.width).toBeCloseTo(200, 0);
    expect(result.children[0]?.rect.x).toBe(0);
    expect(result.children[1]?.rect.x).toBeCloseTo(100, 0);
  });

  it('preserves nested column layout for template-like trees', () => {
    const widget: GenericWidget = {
      type: 'column',
      gap: 4,
      children: [
        { type: 'text', text: 'Title', fontSize: 18 },
        {
          type: 'row',
          gap: 8,
          children: [
            { type: 'text', text: 'Left', flex: 1 },
            { type: 'text', text: 'Right', flex: 1 },
          ],
        },
      ],
    };

    const result = layoutWidget(widget);
    expect(result.children).toHaveLength(2);
    expect(result.children[1]?.children).toHaveLength(2);
  });

  it('applies linear alignment from widget args and child size hints', () => {
    const widget: GenericWidget = {
      type: 'row',
      mainAxisAlignment: 'center',
      crossAxisAlignment: 'end',
      children: [
        { type: 'text', text: 'A', width: 20, height: 10 },
        { type: 'text', text: 'B', width: 30, height: 20 },
      ],
    };

    const result = layoutWidget(widget, {
      minWidth: 0,
      maxWidth: 100,
      minHeight: 0,
      maxHeight: 50,
    });

    expect(result.children[0]?.rect).toEqual({ x: 25, y: 40, width: 20, height: 10 });
    expect(result.children[1]?.rect).toEqual({ x: 45, y: 30, width: 30, height: 20 });
  });

  it('lays out padding and centered single-child wrappers', () => {
    const widget: GenericWidget = {
      type: 'padding',
      padding: 10,
      child: {
        type: 'center',
        child: { type: 'text', text: 'Centered', width: 40, height: 20 },
      },
    };

    const result = layoutWidget(widget, {
      minWidth: 0,
      maxWidth: 100,
      minHeight: 0,
      maxHeight: 80,
    });

    expect(result.children[0]?.rect).toEqual({ x: 10, y: 10, width: 80, height: 60 });
    expect(result.children[0]?.children[0]?.rect).toEqual({ x: 30, y: 30, width: 40, height: 20 });
  });

  it('honors sized box dimensions', () => {
    const result = layoutWidget(
      {
        type: 'sized_box',
        width: 64,
        height: 32,
        child: { type: 'text', text: 'Sized' },
      },
      {
        minWidth: 0,
        maxWidth: 200,
        minHeight: 0,
        maxHeight: 100,
      },
    );

    expect(result.rect).toEqual({ x: 0, y: 0, width: 64, height: 32 });
    expect(result.children[0]?.rect).toEqual({ x: 0, y: 0, width: 64, height: 32 });
  });

  it('applies flexible loose fit metadata from JDW placement', () => {
    const result = layoutWidget(
      {
        type: 'row',
        mainAxisAlignment: 'center',
        children: [
          { type: 'text', text: 'Loose', width: 20, flex: 1, flexFit: 'loose' },
          { type: 'text', text: 'Tight', width: 20, flex: 1, flexFit: 'tight' },
        ],
      },
      {
        minWidth: 0,
        maxWidth: 100,
        minHeight: 0,
        maxHeight: 40,
      },
    );

    expect(result.children[0]?.rect.width).toBe(20);
    expect(result.children[1]?.rect.width).toBe(50);
    expect(result.children[0]?.rect.x).toBe(15);
  });

  it('uses registry measurement for intrinsic linear child placement', () => {
    const registry = createWidgetRegistry([
      {
        type: 'text',
        build: 'text',
        measure: () => ({ width: 20, height: 10 }),
      },
    ]);

    const result = layoutWidget(
      {
        type: 'row',
        mainAxisAlignment: 'center',
        children: [
          { type: 'text', text: 'A' },
          { type: 'text', text: 'B' },
        ],
      },
      {
        minWidth: 0,
        maxWidth: 100,
        minHeight: 0,
        maxHeight: 40,
      },
      { x: 0, y: 0 },
      { registry },
    );

    expect(result.children[0]?.rect).toEqual({ x: 30, y: 0, width: 20, height: 40 });
    expect(result.children[1]?.rect).toEqual({ x: 50, y: 0, width: 20, height: 40 });
  });

  it('keeps grid children on allocated cell rects when registry measurement exists', () => {
    const registry = createWidgetRegistry([
      {
        type: 'text',
        build: 'text',
        measure: () => ({ width: 20, height: 10 }),
      },
    ]);

    const result = layoutWidget(
      {
        type: 'grid',
        columns: 2,
        children: [{ type: 'text', text: 'A', col: 1, row: 0 }],
      },
      {
        minWidth: 0,
        maxWidth: 200,
        minHeight: 0,
        maxHeight: 100,
      },
      { x: 0, y: 0 },
      { registry },
    );

    expect(result.children[0]?.rect).toEqual({ x: 100, y: 0, width: 100, height: 100 });
  });

  it('uses registry measurement to center single-child wrapper content', () => {
    const registry = createWidgetRegistry([
      {
        type: 'text',
        build: 'text',
        measure: () => ({ width: 20, height: 10 }),
      },
    ]);

    const result = layoutWidget(
      {
        type: 'center',
        child: { type: 'text', text: 'A' },
      },
      {
        minWidth: 0,
        maxWidth: 100,
        minHeight: 0,
        maxHeight: 40,
      },
      { x: 0, y: 0 },
      { registry },
    );

    expect(result.children[0]?.rect).toEqual({ x: 40, y: 15, width: 20, height: 10 });
  });
});

describe('loose linear allocation bounds', () => {
  it.each([
    [100, 40, 40],
    [20, 50, 20],
  ])('caps preferred %i by allocation %i', (preferred, allocated, expected) => {
    const layout = layoutWidget(
      {
        type: 'row',
        children: [{ type: 'text', width: preferred, height: 100, flex: 1, flexFit: 'loose' }],
      },
      { minWidth: 0, maxWidth: allocated, minHeight: 0, maxHeight: 30 },
    );
    expect(layout.children[0]?.rect).toEqual({ x: 0, y: 0, width: expected, height: 30 });
  });
  it('keeps ordinary fixed overflow and tight consumption unchanged', () => {
    const bounds = { minWidth: 0, maxWidth: 40, minHeight: 0, maxHeight: 30 };
    expect(layoutWidget({ type: 'text', width: 100, height: 100 }, bounds).rect.width).toBe(100);
    expect(
      layoutWidget({ type: 'text', width: 100, height: 100, flexFit: 'tight' }, bounds).rect,
    ).toEqual({ x: 0, y: 0, width: 40, height: 30 });
  });
});

describe('opt-in intrinsic column text cross constraints', () => {
  const registry = createWidgetRegistry([
    {
      type: 'text',
      build: 'text',
      measure: (widget, constraints) => {
        const text = widget as GenericWidget;
        return estimateWrappedTextSize({
          text: String(text.text),
          fontSize: 10,
          maxWidth: constraints.maxWidth,
          ...(text.textMetricsMode === 'unicode-pre-line-v1'
            ? { textMetricsMode: 'unicode-pre-line-v1' as const }
            : {}),
        });
      },
    },
  ]);
  const leaf = (mode = true): GenericWidget => ({
    type: 'text',
    text: 'x'.repeat(20),
    width: 100,
    flexFit: 'tight',
    ...(mode ? { textMetricsMode: 'unicode-pre-line-v1' } : {}),
  });
  const constraints = (width: number) => ({
    minWidth: 0,
    maxWidth: width,
    minHeight: 0,
    maxHeight: 200,
  });
  it.each(['start', 'center', 'end'])('measures at retained width for %s', (crossAxisAlignment) => {
    const tree = layoutWidget(
      { type: 'column', crossAxisAlignment, padding: 10, children: [leaf()] },
      constraints(480),
      undefined,
      { registry },
    );
    expect(tree.children[0]?.rect.height).toBe(27);
    expect(tree.children[0]?.rect.width).toBe(100);
  });
  it('measures stretch at actual padded width, independent of authored width', () => {
    const tree = layoutWidget(
      { type: 'column', padding: 10, children: [{ ...leaf(), width: 20 }] },
      constraints(120),
      undefined,
      { registry },
    );
    expect(tree.children[0]?.rect).toEqual({ x: 10, y: 10, width: 100, height: 27 });
  });
  it('keeps absent-opt-in legacy measurement unchanged', () => {
    const tree = layoutWidget(
      { type: 'column', crossAxisAlignment: 'start', children: [leaf(false)] },
      constraints(480),
      undefined,
      { registry },
    );
    expect(tree.children[0]?.rect.height).toBe(13.5);
  });
  it('includes wrapped child height in a nested intrinsic Column estimate', () => {
    const tree = layoutWidget(
      {
        type: 'column',
        crossAxisAlignment: 'start',
        children: [
          {
            type: 'column',
            width: 120,
            padding: 10,
            flexFit: 'tight',
            crossAxisAlignment: 'start',
            children: [leaf()],
          },
        ],
      },
      constraints(480),
      undefined,
      { registry },
    );
    expect(tree.children[0]?.rect.height).toBe(47);
    expect(tree.children[0]?.children[0]?.rect.height).toBe(27);
  });
});

it.each([
  ['start', 100, 27],
  ['stretch', 120, 13.5],
] as const)(
  'propagates cross constraints through two padded Columns with %s and unchanged legacy inputs',
  (crossAxisAlignment, textWidth, textHeight) => {
    const legacyWidths: number[] = [];
    const registry = createWidgetRegistry([
      {
        type: 'text',
        build: 'text',
        measure: (widget, constraints) => {
          const text = widget as GenericWidget;
          if (text.id === 'legacy') legacyWidths.push(constraints.maxWidth);
          return estimateWrappedTextSize({
            text: String(text.text),
            fontSize: 10,
            maxWidth: constraints.maxWidth,
            ...(text.textMetricsMode === 'unicode-pre-line-v1'
              ? { textMetricsMode: 'unicode-pre-line-v1' as const }
              : {}),
          });
        },
      },
    ]);
    const tree = layoutWidget(
      {
        type: 'column',
        crossAxisAlignment: 'start',
        children: [
          {
            type: 'column',
            width: 160,
            padding: 10,
            flexFit: 'tight',
            children: [
              {
                type: 'column',
                width: 120,
                padding: 10,
                gap: 4,
                crossAxisAlignment,
                flexFit: 'tight',
                children: [
                  {
                    id: 'custom',
                    type: 'text',
                    text: 'x'.repeat(20),
                    width: 100,
                    flexFit: 'tight',
                    textMetricsMode: 'unicode-pre-line-v1',
                  },
                  { id: 'legacy', type: 'text', text: 'old', width: 100, flexFit: 'tight' },
                ],
              },
            ],
          },
        ],
      },
      { minWidth: 0, maxWidth: 480, minHeight: 0, maxHeight: 200 },
      undefined,
      { registry },
    );
    const group = tree.children[0]!;
    const nested = group.children[0]!;
    expect(group.rect.height).toBe(textHeight + 13.5 + 4 + 40);
    expect(nested.rect.width).toBe(140);
    expect(nested.children[0]?.rect).toMatchObject({ width: textWidth, height: textHeight });
    expect(nested.children[1]?.rect.height).toBe(13.5);
    expect(legacyWidths).toContain(480);
  },
);
