import { describe, expect, it } from 'vitest';

import { formatWidgetJson } from './parse-widget-json.js';
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
  getWidgetDisplayLabel,
  type GenericWidget,
} from './widget-tree.js';

const rootWidget: GenericWidget = {
  type: 'demo:layout',
  columns: 2,
  children: [
    {
      type: 'demo:stack',
      children: [
        {
          type: 'demo:box',
          child: { type: 'demo:text', text: 'nested' },
        },
      ],
    },
    {
      type: 'demo:card',
      title: 'Tile',
    },
  ],
};

describe('generic widget tree', () => {
  it('addresses array and box child paths with stable keys', () => {
    const boxPath = appendChildrenPath(appendChildrenPath(ROOT_WIDGET_PATH, 0), 0);
    const textPath = appendBoxChildPath(boxPath);

    expect(widgetPathKey(textPath)).toBe('$.children[0].children[0].child');
    expect(getWidgetAtPath(rootWidget, textPath)).toEqual({
      type: 'demo:text',
      text: 'nested',
    });
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

    expect(nodes.length).toBeGreaterThan(3);
    expect(nodes[0]?.path).toEqual([]);
    expect(nodes.some((node) => node.widget.type === 'demo:text')).toBe(true);
  });

  it('applies replace-widget patches', () => {
    const textPath = appendBoxChildPath(
      appendChildrenPath(appendChildrenPath(ROOT_WIDGET_PATH, 0), 0),
    );
    const result = applyWidgetPatch(rootWidget, {
      type: 'replace-widget',
      path: textPath,
      widget: { type: 'demo:text', text: 'updated' },
    });

    expect(result.changed).toBe(true);
    expect(getWidgetAtPath(result.root, textPath)).toEqual({
      type: 'demo:text',
      text: 'updated',
    });
    expect(formatWidgetJson(result.root)).toContain('"updated"');
  });

  it('builds display labels from type and optional id', () => {
    expect(getWidgetDisplayLabel({ type: 'demo:card', title: 'x' })).toBe('demo:card');
    expect(getWidgetDisplayLabel({ type: 'demo:card', id: 'hero' })).toBe('demo:card (hero)');
  });
});
