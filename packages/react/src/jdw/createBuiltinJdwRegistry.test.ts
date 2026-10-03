import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ReactNode } from 'react';
import { estimateWrappedTextSize, layoutWidget, type GenericWidget } from '@workbench-kit/jdw';

import { createBuiltinJdwRegistry } from './createBuiltinJdwRegistry.js';

describe('createBuiltinJdwRegistry', () => {
  it('registers editable static JDW builtins for authoring surfaces', () => {
    const registry = createBuiltinJdwRegistry();

    expect(registry.types()).toEqual(
      expect.arrayContaining([
        'text',
        'row',
        'column',
        'stack',
        'container',
        'padding',
        'align',
        'center',
        'sized_box',
        'image',
        'icon',
        'button',
        'grid',
      ]),
    );
    expect(registry.definition('image')?.inspector?.[0]?.title).toBe('Image');
    expect(registry.definition('button')?.schema?.required).toContain('label');
  });

  it('keeps registry builders leaf-only so containers use the layout backend', () => {
    const registry = createBuiltinJdwRegistry();
    const textBuild = registry.get('text') as ((widget: GenericWidget) => unknown) | undefined;
    const rowBuild = registry.get('row') as ((widget: GenericWidget) => unknown) | undefined;

    expect(
      renderToStaticMarkup(
        createElement('div', null, textBuild?.({ type: 'text', text: 'Leaf' }) as ReactNode),
      ),
    ).toContain('Leaf');
    expect(rowBuild?.({ type: 'row', children: [{ type: 'text', text: 'Child' }] })).toBeNull();
  });

  it('provides intrinsic measure hooks for static leaf layout', () => {
    const registry = createBuiltinJdwRegistry();
    const constraints = { minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 100 };

    expect(
      registry
        .definition('text')
        ?.measure?.({ type: 'text', text: 'Measured' } as GenericWidget, constraints)?.width,
    ).toBeGreaterThan(0);
    expect(
      registry
        .definition('icon')
        ?.measure?.({ type: 'icon', size: 24 } as GenericWidget, constraints),
    ).toEqual({ width: 24, height: 24 });
    expect(
      registry
        .definition('button')
        ?.measure?.({ type: 'button', label: 'Run' } as GenericWidget, constraints)?.height,
    ).toBe(28);
  });

  it('wraps text measure height when maxWidth constrains content', () => {
    const registry = createBuiltinJdwRegistry();
    const wide = registry
      .definition('text')
      ?.measure?.(
        { type: 'text', text: 'alpha beta gamma delta epsilon', fontSize: 10 } as GenericWidget,
        { minWidth: 0, maxWidth: 10_000, minHeight: 0, maxHeight: 10_000 },
      );
    const narrow = registry
      .definition('text')
      ?.measure?.(
        { type: 'text', text: 'alpha beta gamma delta epsilon', fontSize: 10 } as GenericWidget,
        { minWidth: 0, maxWidth: 40, minHeight: 0, maxHeight: 10_000 },
      );

    expect(wide?.height).toBeLessThan(narrow?.height ?? 0);
    expect(narrow?.width).toBeLessThanOrEqual(40);
  });
});

describe('opt-in builtin text and intrinsic image rendering', () => {
  const registry = createBuiltinJdwRegistry();
  const constraints = { minWidth: 0, maxWidth: 23, minHeight: 0, maxHeight: 1_000 };
  const renderText = (widget: GenericWidget) => {
    const build = registry.get('text') as (widget: GenericWidget) => ReactNode;
    return renderToStaticMarkup(createElement('div', null, build(widget)));
  };

  it('uses the same explicit font metrics in the registry measure hook and renderer', () => {
    const widget = {
      type: 'text',
      text: '😀abc\n',
      fontSize: 10,
      fontWeight: 700,
      textAlign: 'end',
      textMetricsMode: 'unicode-pre-line-v1',
    } as const;
    const estimate = estimateWrappedTextSize({ ...widget, maxWidth: constraints.maxWidth });
    expect(registry.definition('text')?.measure?.(widget, constraints)).toEqual({
      width: estimate.width,
      height: estimate.height,
    });
    const markup = renderText(widget);
    for (const style of [
      'font-size:10px',
      'font-weight:700',
      'font-family:system-ui, sans-serif',
      'line-height:1.35',
      'white-space:pre-wrap',
      'overflow-wrap:anywhere',
      'display:block',
      'width:100%',
      'text-align:end',
    ]) {
      expect(markup).toContain(style);
    }
    expect(markup).toContain('😀abc\n');
  });

  it('measures explicit blank lines and ignores alignment for intrinsic size', () => {
    const widget = {
      type: 'text',
      text: '\n\n',
      fontSize: 10,
      textMetricsMode: 'unicode-pre-line-v1',
    };
    const measure = registry.definition('text')?.measure;
    expect(measure?.(widget, constraints)).toEqual({ width: 0, height: 40.5 });
    expect(measure?.({ ...widget, textAlign: 'center' } as GenericWidget, constraints)).toEqual(
      measure?.({ ...widget, textAlign: 'start' } as GenericWidget, constraints),
    );
  });

  it('wires new text measurement into actual row layout and clamps narrow constraints', () => {
    const child = {
      type: 'text',
      text: 'abcd',
      fontSize: 10,
      textMetricsMode: 'unicode-pre-line-v1',
    };
    const tree = (fontWeight: 400 | 700) =>
      layoutWidget(
        { type: 'row', crossAxisAlignment: 'start', children: [{ ...child, fontWeight }] },
        constraints,
        { x: 0, y: 0 },
        { registry },
      );
    expect(tree(400).children[0]?.rect.height).toBe(13.5);
    expect(tree(700).children[0]?.rect.height).toBe(27);
    expect(tree(700).children[0]?.rect.width).toBeLessThanOrEqual(23);
  });

  it('leaves legacy rendering and measurement styles unchanged without the mode', () => {
    const widget = { type: 'text', text: 'Legacy', fontSize: 18 };
    expect(renderText(widget)).toBe(
      '<div><span data-widget-type="text" style="font-size:18px">Legacy</span></div>',
    );
    expect(renderText({ ...widget, fontWeight: 700, textAlign: 'end' })).toBe(renderText(widget));
    expect(
      registry
        .definition('text')
        ?.measure?.({ ...widget, text: '\n\n' } as GenericWidget, constraints),
    ).toEqual({ width: 0, height: 24.3 });
  });

  const px = (value: number) => ({ kind: 'length', unit: 'px', value });
  const authoredImage = (width: unknown = px(73), height: unknown = px(41)): GenericWidget => ({
    type: 'image',
    id: 'picture',
    $authoring: {
      component: { id: 'example.image', version: '1' },
      properties: {},
      layout: {
        strategyId: 'example.row',
        values: {
          preferredFrame: {
            kind: 'literal',
            value: {
              kind: 'canvas-placement',
              x: px(0),
              y: px(0),
              width,
              height,
              anchor: 'top-start',
              zIndex: 0,
            },
          },
        },
      },
    },
  });
  const imageConstraints = { minWidth: 0, maxWidth: 300, minHeight: 0, maxHeight: 200 };

  it('falls back to original preferred placement for intrinsic images without bitmap metadata', () => {
    const measure = registry.definition('image')?.measure;
    const authoredNode = authoredImage();
    const projected = { type: 'image', authoredNode, height: 29 };
    expect(measure?.(projected, imageConstraints)).toEqual({ width: 73, height: 29 });
    expect(
      measure?.({ ...projected, src: 'asset:unavailable' } as GenericWidget, imageConstraints),
    ).toEqual({
      width: 73,
      height: 29,
    });
    expect(measure?.(authoredNode, imageConstraints)).toEqual({ width: 73, height: 41 });
    const tree = layoutWidget(
      { type: 'row', children: [projected, { type: 'box', flex: 1, flexFit: 'tight' }] },
      imageConstraints,
      { x: 0, y: 0 },
      { registry },
    );
    expect(tree.children[0]?.rect.width).toBe(73);
    expect(tree.children[1]?.rect.x).toBe(73);
  });

  it('retains legacy defaults and ignores unsupported preferred dimensions', () => {
    const measure = registry.definition('image')?.measure;
    expect(measure?.({ type: 'image' }, imageConstraints)).toEqual({ width: 120, height: 80 });
    expect(
      measure?.(
        {
          type: 'image',
          authoredNode: authoredImage(px(Number.NaN), { kind: 'percentage', value: 50 }),
        } as GenericWidget,
        imageConstraints,
      ),
    ).toEqual({ width: 120, height: 80 });
    expect(
      measure?.({ type: 'image', authoredNode: authoredImage() } as GenericWidget, constraints),
    ).toEqual({
      width: 23,
      height: 41,
    });
  });
});
