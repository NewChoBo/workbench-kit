import { describe, expect, it } from 'vitest';

import {
  formatWidgetJson,
  getWidgetChildren,
  parseWidgetJson,
  ROOT_WIDGET_PATH,
  type GenericWidget,
} from '@workbench-kit/json-widget';

import { EMPTY_PLAYGROUND_DOCUMENT, PLAYGROUND_WIDGET_TEMPLATES } from './demo-registry.js';
import {
  insertPlaygroundWidget,
  resolveGridCellFromCanvasPoint,
  resolveInsertTarget,
} from './playground-insert.js';

describe('playground insert helpers', () => {
  it('inserts a text widget at the root grid by default', () => {
    const next = insertPlaygroundWidget(
      EMPTY_PLAYGROUND_DOCUMENT,
      PLAYGROUND_WIDGET_TEMPLATES[0]!,
      null,
    );
    expect(next).not.toBeNull();

    const parsed = parseWidgetJson<GenericWidget>(next!);
    expect(parsed.parseError).toBeNull();
    expect(getWidgetChildren(parsed.value!)).toHaveLength(1);
    expect(getWidgetChildren(parsed.value!)[0]).toMatchObject({
      type: 'text',
      text: 'New text',
    });
  });

  it('inserts into a selected container path', () => {
    const document = formatWidgetJson({
      type: 'grid',
      columns: 2,
      children: [
        {
          type: 'stack',
          col: 0,
          row: 0,
          children: [{ type: 'text', text: 'existing', left: 0, top: 0 }],
        },
      ],
    });

    const target = resolveInsertTarget(parseWidgetJson<GenericWidget>(document).value!, [
      { kind: 'children', index: 0 },
    ]);

    expect(target).toEqual({
      parentPath: [{ kind: 'children', index: 0 }],
      index: 1,
      mode: 'insert-child',
    });

    const next = insertPlaygroundWidget(document, PLAYGROUND_WIDGET_TEMPLATES[0]!, [
      { kind: 'children', index: 0 },
    ]);
    const stack = getWidgetChildren(parseWidgetJson<GenericWidget>(next!).value!)[0];
    expect(getWidgetChildren(stack!)).toHaveLength(2);
  });

  it('falls back to root when selection is a leaf', () => {
    const root = parseWidgetJson<GenericWidget>(EMPTY_PLAYGROUND_DOCUMENT).value!;
    const target = resolveInsertTarget(root, [{ kind: 'children', index: 0 }]);
    expect(target.parentPath).toEqual(ROOT_WIDGET_PATH);
    expect(target.index).toBe(0);
  });

  it('applies grid position and child override when inserting', () => {
    const imageTemplate = PLAYGROUND_WIDGET_TEMPLATES.find((template) => template.id === 'image');
    expect(imageTemplate).toBeDefined();

    const next = insertPlaygroundWidget(EMPTY_PLAYGROUND_DOCUMENT, imageTemplate!, null, {
      gridPosition: { col: 1, row: 0 },
      childOverride: {
        type: 'image',
        src: 'asset:test-id',
        fit: 'cover',
      },
    });

    const child = getWidgetChildren(parseWidgetJson<GenericWidget>(next!).value!)[0];
    expect(child).toMatchObject({
      type: 'image',
      src: 'asset:test-id',
      col: 1,
      row: 0,
    });
  });

  it('inserts into an empty box via set-box-child', () => {
    const document = formatWidgetJson({
      type: 'grid',
      columns: 1,
      children: [{ type: 'box', col: 0, row: 0, padding: 8 }],
    });

    const next = insertPlaygroundWidget(document, PLAYGROUND_WIDGET_TEMPLATES[0]!, [
      { kind: 'children', index: 0 },
    ]);
    const box = getWidgetChildren(parseWidgetJson<GenericWidget>(next!).value!)[0];
    expect(box?.child).toMatchObject({ type: 'text', text: 'New text' });
  });

  it('inserts into document inner grid when document is selected', () => {
    const document = formatWidgetJson({
      type: 'document',
      title: 'Page',
      child: { type: 'grid', columns: 2, rows: 2, children: [] },
    });

    const next = insertPlaygroundWidget(document, PLAYGROUND_WIDGET_TEMPLATES[0]!, []);
    const root = parseWidgetJson<GenericWidget>(next!).value!;
    expect(root?.type).toBe('document');
    const grid = (root as GenericWidget & { child?: GenericWidget }).child;
    expect(getWidgetChildren(grid!)).toHaveLength(1);
  });

  it('maps canvas coordinates to grid cells', () => {
    const root = parseWidgetJson<GenericWidget>(EMPTY_PLAYGROUND_DOCUMENT).value!;
    expect(
      resolveGridCellFromCanvasPoint(root, { x: 20, y: 20 }, { width: 420, height: 320 }),
    ).toEqual({ col: 0, row: 0 });
    expect(
      resolveGridCellFromCanvasPoint(root, { x: 300, y: 200 }, { width: 420, height: 320 }),
    ).toEqual({ col: 1, row: 1 });
  });
});
