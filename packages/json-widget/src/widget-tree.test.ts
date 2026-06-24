import { describe, expect, it } from 'vitest';

import { formatWidgetDocumentJson } from './document.js';
import {
  appendBoxChildPath,
  appendChildrenPath,
  parseWidgetPathKey,
  ROOT_WIDGET_PATH,
  widgetPathKey,
} from './path.js';
import { applyWidgetPatch } from './widget-patch.js';
import {
  collectWidgetNodes,
  getWidgetAtPath,
  updateWidgetAtPath,
  type GenericWidget,
} from './widget-tree.js';

const rootWidget: GenericWidget = {
  type: 'grid',
  columns: 2,
  children: [
    {
      type: 'stack',
      col: 0,
      row: 0,
      children: [
        {
          type: 'box',
          left: 8,
          top: 12,
          child: { type: 'text', text: 'nested' },
        },
      ],
    },
    {
      type: 'tile',
      col: 1,
      row: 0,
      layers: [{ type: 'text', text: 'Tile' }],
    },
  ],
};

describe('generic widget tree', () => {
  it('addresses array and box child paths with stable keys', () => {
    const boxPath = appendChildrenPath(appendChildrenPath(ROOT_WIDGET_PATH, 0), 0);
    const textPath = appendBoxChildPath(boxPath);

    expect(widgetPathKey(textPath)).toBe('$.children[0].children[0].child');
    expect(getWidgetAtPath(rootWidget, textPath)).toEqual({ type: 'text', text: 'nested' });
  });

  it('round-trips path keys', () => {
    const textPath = appendBoxChildPath(
      appendChildrenPath(appendChildrenPath(ROOT_WIDGET_PATH, 0), 0),
    );

    expect(parseWidgetPathKey(widgetPathKey(textPath))).toEqual(textPath);
    expect(parseWidgetPathKey('$.children[1]')).toEqual([{ kind: 'children', index: 1 }]);
    expect(parseWidgetPathKey('$.child')).toEqual([{ kind: 'child' }]);
  });

  it('collects editable nodes with parent relationships', () => {
    const nodes = collectWidgetNodes(rootWidget);

    expect(nodes.map((node) => `${node.widget.type}:${widgetPathKey(node.path)}`)).toEqual([
      'grid:$',
      'stack:$.children[0]',
      'box:$.children[0].children[0]',
      'text:$.children[0].children[0].child',
      'tile:$.children[1]',
    ]);
  });

  it('preserves parent placement fields when a widget is replaced', () => {
    const tilePath = appendChildrenPath(ROOT_WIDGET_PATH, 1);
    const result = applyWidgetPatch(rootWidget, {
      type: 'replace-widget',
      path: tilePath,
      widget: { type: 'text', text: 'replacement' },
    });

    expect(result.changed).toBe(true);
    const child = (result.root.children as GenericWidget[] | undefined)?.[1];
    expect(child).toMatchObject({
      type: 'text',
      text: 'replacement',
      col: 1,
      row: 0,
    });
  });

  it('updates explicit grid placement fields when a widget is replaced', () => {
    const tilePath = appendChildrenPath(ROOT_WIDGET_PATH, 1);
    const result = applyWidgetPatch(rootWidget, {
      type: 'replace-widget',
      path: tilePath,
      widget: { type: 'text', text: 'replacement', col: 0, row: 1 },
    });

    expect(result.changed).toBe(true);
    expect((result.root.children as GenericWidget[] | undefined)?.[1]).toMatchObject({
      type: 'text',
      text: 'replacement',
      col: 0,
      row: 1,
    });
  });

  it('updates a nested widget without mutating invalid paths', () => {
    const textPath = appendBoxChildPath(
      appendChildrenPath(appendChildrenPath(ROOT_WIDGET_PATH, 0), 0),
    );
    const updated = updateWidgetAtPath(rootWidget, textPath, (widget) =>
      widget.type === 'text' ? { ...widget, text: 'changed' } : widget,
    );
    const invalid = updateWidgetAtPath(
      rootWidget,
      appendChildrenPath(ROOT_WIDGET_PATH, 9),
      (widget) => ({ ...widget }),
    );

    expect(getWidgetAtPath(updated.root, textPath)).toEqual({ type: 'text', text: 'changed' });
    expect(invalid).toEqual({ root: rootWidget, changed: false });
  });

  it('assigns grid placement when inserting children without col/row', () => {
    const inserted = applyWidgetPatch(rootWidget, {
      type: 'insert-child',
      parentPath: ROOT_WIDGET_PATH,
      index: 1,
      child: { type: 'text', text: 'grid sibling', col: 0, row: 1 },
    });
    const autoPlaced = applyWidgetPatch(rootWidget, {
      type: 'insert-child',
      parentPath: ROOT_WIDGET_PATH,
      index: 1,
      child: { type: 'text', text: 'missing grid placement' },
    });

    expect((inserted.root.children as GenericWidget[])[1]?.type).toBe('text');
    expect(autoPlaced.changed).toBe(true);
    expect((autoPlaced.root.children as GenericWidget[])[1]).toMatchObject({
      type: 'text',
      text: 'missing grid placement',
      col: 0,
      row: 1,
    });
  });

  it('reorders stack children without dropping their edge placement', () => {
    const stackRoot: GenericWidget = {
      type: 'stack',
      children: [
        { type: 'text', text: 'back', left: 0, top: 0 },
        { type: 'text', text: 'front', left: 20, top: 30 },
      ],
    };

    const result = applyWidgetPatch(stackRoot, {
      type: 'reorder-child',
      parentPath: ROOT_WIDGET_PATH,
      fromIndex: 1,
      toIndex: 0,
    });

    expect(result.root.children).toEqual([
      { type: 'text', text: 'front', left: 20, top: 30 },
      { type: 'text', text: 'back', left: 0, top: 0 },
    ]);
  });

  it('sets and removes box children through patch operations', () => {
    const boxPath = appendChildrenPath(appendChildrenPath(ROOT_WIDGET_PATH, 0), 0);
    const replaced = applyWidgetPatch(rootWidget, {
      type: 'set-box-child',
      boxPath,
      child: { type: 'image', src: 'icon.png' },
    });
    const removed = applyWidgetPatch(replaced.root, {
      type: 'remove-widget',
      path: appendBoxChildPath(boxPath),
    });

    expect(getWidgetAtPath(replaced.root, appendBoxChildPath(boxPath))).toEqual({
      type: 'image',
      src: 'icon.png',
    });
    expect(getWidgetAtPath(removed.root, appendBoxChildPath(boxPath))).toBeNull();
  });

  it('inserts a child into empty single-child wrappers', () => {
    const paddingRoot: GenericWidget = { type: 'padding', padding: 8 };
    const result = applyWidgetPatch(paddingRoot, {
      type: 'insert-child',
      parentPath: ROOT_WIDGET_PATH,
      index: 0,
      child: { type: 'text', text: 'wrapped' },
    });

    expect(result.changed).toBe(true);
    expect(getWidgetAtPath(result.root, appendBoxChildPath(ROOT_WIDGET_PATH))).toEqual({
      type: 'text',
      text: 'wrapped',
    });
  });

  it('removes array children by their widget path', () => {
    const result = applyWidgetPatch(rootWidget, {
      type: 'remove-widget',
      path: appendChildrenPath(ROOT_WIDGET_PATH, 1),
    });

    expect(result.root.children).toHaveLength(1);
    expect(getWidgetAtPath(result.root, appendChildrenPath(ROOT_WIDGET_PATH, 1))).toBeNull();
  });

  it('reparents widget across different containers', () => {
    const tilePath = appendChildrenPath(ROOT_WIDGET_PATH, 1);
    const stackPath = appendChildrenPath(ROOT_WIDGET_PATH, 0);

    const result = applyWidgetPatch(rootWidget, {
      type: 'reparent-widget',
      fromPath: tilePath,
      toParentPath: stackPath,
      insertIndex: 0,
    });

    expect(result.changed).toBe(true);
    const newStack = getWidgetAtPath(result.root, stackPath);
    expect(newStack?.children).toHaveLength(2);
    expect((newStack?.children as GenericWidget[])[0]?.type).toBe('tile');
    expect(result.root.children).toHaveLength(1);
  });

  it('uses reparent patches for same-parent before and after moves', () => {
    const root: GenericWidget = {
      type: 'column',
      children: [
        { type: 'text', text: 'A' },
        { type: 'text', text: 'B' },
        { type: 'text', text: 'C' },
      ],
    };

    const movedBefore = applyWidgetPatch(root, {
      type: 'reparent-widget',
      fromPath: appendChildrenPath(ROOT_WIDGET_PATH, 2),
      toParentPath: ROOT_WIDGET_PATH,
      insertIndex: 0,
    });

    expect((movedBefore.root.children as GenericWidget[]).map((child) => child.text)).toEqual([
      'C',
      'A',
      'B',
    ]);

    const movedAfter = applyWidgetPatch(root, {
      type: 'reparent-widget',
      fromPath: appendChildrenPath(ROOT_WIDGET_PATH, 0),
      toParentPath: ROOT_WIDGET_PATH,
      insertIndex: 3,
    });

    expect((movedAfter.root.children as GenericWidget[]).map((child) => child.text)).toEqual([
      'B',
      'C',
      'A',
    ]);
  });

  it('adjusts reparent target parent paths after removing an earlier sibling', () => {
    const root: GenericWidget = {
      type: 'column',
      children: [
        { type: 'text', text: 'Title' },
        {
          type: 'row',
          children: [
            { type: 'text', text: 'Left' },
            { type: 'text', text: 'Right' },
          ],
        },
      ],
    };

    const result = applyWidgetPatch(root, {
      type: 'reparent-widget',
      fromPath: appendChildrenPath(ROOT_WIDGET_PATH, 0),
      toParentPath: appendChildrenPath(ROOT_WIDGET_PATH, 1),
      insertIndex: 1,
    });

    expect(result.changed).toBe(true);
    expect(result.root.children).toHaveLength(1);
    expect(
      (
        getWidgetAtPath(result.root, appendChildrenPath(ROOT_WIDGET_PATH, 0))?.children as
          | GenericWidget[]
          | undefined
      )?.map((child) => child.text),
    ).toEqual(['Left', 'Title', 'Right']);
  });

  it('reparents a single-child wrapper slot into an array container', () => {
    const root: GenericWidget = {
      type: 'column',
      children: [
        {
          type: 'padding',
          child: { type: 'text', text: 'Wrapped' },
        },
        {
          type: 'row',
          children: [],
        },
      ],
    };

    const result = applyWidgetPatch(root, {
      type: 'reparent-widget',
      fromPath: appendBoxChildPath(appendChildrenPath(ROOT_WIDGET_PATH, 0)),
      toParentPath: appendChildrenPath(ROOT_WIDGET_PATH, 1),
      insertIndex: 0,
    });

    expect(result.changed).toBe(true);
    expect(
      getWidgetAtPath(result.root, appendBoxChildPath(appendChildrenPath(ROOT_WIDGET_PATH, 0))),
    ).toBeNull();
    expect(
      getWidgetAtPath(result.root, appendChildrenPath(appendChildrenPath(ROOT_WIDGET_PATH, 1), 0)),
    ).toEqual({ type: 'text', text: 'Wrapped' });
  });

  it('applies replace-widget patches for demo types', () => {
    const demoRoot: GenericWidget = {
      type: 'demo:layout',
      columns: 2,
      children: [{ type: 'demo:card', title: 'Tile' }],
    };
    const result = applyWidgetPatch(demoRoot, {
      type: 'replace-widget',
      path: appendChildrenPath(ROOT_WIDGET_PATH, 0),
      widget: { type: 'demo:card', title: 'Updated' },
    });

    expect(result.changed).toBe(true);
    expect(formatWidgetDocumentJson(result.root)).toContain('Updated');
  });
});
