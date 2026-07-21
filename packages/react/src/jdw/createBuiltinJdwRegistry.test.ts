import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ReactNode } from 'react';
import type { GenericWidget } from '@workbench-kit/jdw';

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
