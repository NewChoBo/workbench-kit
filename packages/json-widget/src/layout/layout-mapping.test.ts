import { describe, expect, it } from 'vitest';

import { appendBoxChildPath, appendChildrenPath, ROOT_WIDGET_PATH } from '../path.js';
import { applyWidgetPatch } from '../widget-patch.js';
import type { GenericWidget } from '../widget-tree.js';
import {
  createWidgetDragPatch,
  createWidgetResizePatch,
  hitTestLayoutTree,
} from './layout-mapping.js';
import { layoutWidget } from './layout-widget.js';

describe('layout mapping', () => {
  it('hit-tests the deepest topmost layout node by widget path', () => {
    const root: GenericWidget = {
      type: 'stack',
      width: 200,
      height: 100,
      children: [
        { type: 'text', text: 'Back', left: 0, top: 0 },
        { type: 'text', text: 'Front', left: 20, top: 10, right: 80, bottom: 50 },
      ],
    };

    const layout = layoutWidget(root, {
      minWidth: 0,
      maxWidth: 200,
      minHeight: 0,
      maxHeight: 100,
    });

    expect(hitTestLayoutTree(layout, { x: 25, y: 15 })?.path).toEqual(
      appendChildrenPath(ROOT_WIDGET_PATH, 1),
    );
    expect(hitTestLayoutTree(layout, { x: 190, y: 90 })?.path).toEqual(
      appendChildrenPath(ROOT_WIDGET_PATH, 0),
    );
    expect(hitTestLayoutTree(layout, { x: 250, y: 90 })).toBeNull();
  });

  it('keeps single-child wrapper paths addressable through hit-test', () => {
    const root: GenericWidget = {
      type: 'padding',
      padding: 10,
      child: { type: 'text', text: 'Padded' },
    };

    const layout = layoutWidget(root, {
      minWidth: 0,
      maxWidth: 100,
      minHeight: 0,
      maxHeight: 80,
    });

    expect(hitTestLayoutTree(layout, { x: 20, y: 20 })?.path).toEqual(
      appendBoxChildPath(ROOT_WIDGET_PATH),
    );
  });

  it('maps stack child drag deltas to placement-preserving replace patches', () => {
    const root: GenericWidget = {
      type: 'stack',
      width: 200,
      height: 100,
      children: [{ type: 'text', text: 'Panel', left: 20, top: 10, right: 30, bottom: 15 }],
    };
    const path = appendChildrenPath(ROOT_WIDGET_PATH, 0);
    const layout = layoutWidget(root, {
      minWidth: 0,
      maxWidth: 200,
      minHeight: 0,
      maxHeight: 100,
    });

    const patch = createWidgetDragPatch({
      root,
      layout,
      path,
      deltaX: 5,
      deltaY: 10,
    });

    expect(patch).toEqual({
      type: 'replace-widget',
      path,
      widget: {
        type: 'text',
        text: 'Panel',
        left: 25,
        top: 20,
        right: 25,
        bottom: 5,
      },
    });

    const result = applyWidgetPatch(root, patch!);
    const nextLayout = layoutWidget(result.root, {
      minWidth: 0,
      maxWidth: 200,
      minHeight: 0,
      maxHeight: 100,
    });
    expect(nextLayout.children[0]?.rect).toEqual({ x: 25, y: 20, width: 150, height: 75 });
  });

  it('maps grid child drag centers to grid placement patches', () => {
    const root: GenericWidget = {
      type: 'grid',
      columns: 2,
      rows: 2,
      width: 200,
      height: 200,
      children: [{ type: 'text', text: 'Cell', col: 0, row: 0 }],
    };
    const path = appendChildrenPath(ROOT_WIDGET_PATH, 0);
    const layout = layoutWidget(root, {
      minWidth: 0,
      maxWidth: 200,
      minHeight: 0,
      maxHeight: 200,
    });

    const patch = createWidgetDragPatch({
      root,
      layout,
      path,
      deltaX: 110,
      deltaY: 110,
    });

    expect(patch).toEqual({
      type: 'replace-widget',
      path,
      widget: { type: 'text', text: 'Cell', col: 1, row: 1 },
    });
  });

  it.each([
    [
      'n',
      { deltaX: 3, deltaY: -5 },
      { left: 20, top: 5, right: 30, bottom: 15 },
      { x: 20, y: 5, width: 150, height: 80 },
    ],
    [
      'ne',
      { deltaX: 15, deltaY: -5 },
      { left: 20, top: 5, right: 15, bottom: 15 },
      { x: 20, y: 5, width: 165, height: 80 },
    ],
    [
      'e',
      { deltaX: 15, deltaY: 3 },
      { left: 20, top: 10, right: 15, bottom: 15 },
      { x: 20, y: 10, width: 165, height: 75 },
    ],
    [
      'se',
      { deltaX: 15, deltaY: 10 },
      { left: 20, top: 10, right: 15, bottom: 5 },
      { x: 20, y: 10, width: 165, height: 85 },
    ],
    [
      's',
      { deltaX: 3, deltaY: 10 },
      { left: 20, top: 10, right: 30, bottom: 5 },
      { x: 20, y: 10, width: 150, height: 85 },
    ],
    [
      'sw',
      { deltaX: -10, deltaY: 10 },
      { left: 10, top: 10, right: 30, bottom: 5 },
      { x: 10, y: 10, width: 160, height: 85 },
    ],
    [
      'w',
      { deltaX: -10, deltaY: 3 },
      { left: 10, top: 10, right: 30, bottom: 15 },
      { x: 10, y: 10, width: 160, height: 75 },
    ],
    [
      'nw',
      { deltaX: -10, deltaY: -5 },
      { left: 10, top: 5, right: 30, bottom: 15 },
      { x: 10, y: 5, width: 160, height: 80 },
    ],
  ] as const)(
    'maps stack child %s resize deltas to edge-preserving replace patches',
    (position, delta, expectedPlacement, expectedRect) => {
      const root: GenericWidget = {
        type: 'stack',
        width: 200,
        height: 100,
        children: [{ type: 'text', text: 'Panel', left: 20, top: 10, right: 30, bottom: 15 }],
      };
      const path = appendChildrenPath(ROOT_WIDGET_PATH, 0);
      const layout = layoutWidget(root, {
        minWidth: 0,
        maxWidth: 200,
        minHeight: 0,
        maxHeight: 100,
      });

      const patch = createWidgetResizePatch({
        root,
        layout,
        path,
        position,
        deltaX: delta.deltaX,
        deltaY: delta.deltaY,
      });

      expect(patch).toEqual({
        type: 'replace-widget',
        path,
        widget: {
          type: 'text',
          text: 'Panel',
          ...expectedPlacement,
        },
      });

      const result = applyWidgetPatch(root, patch!);
      const nextLayout = layoutWidget(result.root, {
        minWidth: 0,
        maxWidth: 200,
        minHeight: 0,
        maxHeight: 100,
      });
      expect(nextLayout.children[0]?.rect).toEqual(expectedRect);
    },
  );

  it('does not produce drag patches for roots or box child slots', () => {
    const root: GenericWidget = {
      type: 'box',
      child: { type: 'text', text: 'Wrapped' },
    };
    const layout = layoutWidget(root);

    expect(
      createWidgetDragPatch({
        root,
        layout,
        path: ROOT_WIDGET_PATH,
        deltaX: 10,
        deltaY: 10,
      }),
    ).toBeNull();
    expect(
      createWidgetDragPatch({
        root,
        layout,
        path: appendBoxChildPath(ROOT_WIDGET_PATH),
        deltaX: 10,
        deltaY: 10,
      }),
    ).toBeNull();
    expect(
      createWidgetResizePatch({
        root,
        layout,
        path: ROOT_WIDGET_PATH,
        position: 'se',
        deltaX: 10,
        deltaY: 10,
      }),
    ).toBeNull();
    expect(
      createWidgetResizePatch({
        root,
        layout,
        path: appendBoxChildPath(ROOT_WIDGET_PATH),
        position: 'se',
        deltaX: 10,
        deltaY: 10,
      }),
    ).toBeNull();
  });
});
