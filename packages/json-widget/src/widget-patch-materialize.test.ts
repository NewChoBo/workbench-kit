import { describe, expect, it } from 'vitest';

import { ROOT_WIDGET_PATH } from './path.js';
import { appendChildrenPath } from './path.js';
import { getWidgetAtPath, getWidgetChildren } from './widget-tree.js';
import { applyWidgetPatch } from './widget-patch.js';
import { materializeWidgetPlacementAsset } from './widget-placement-asset.js';
import type { GenericWidget } from './widget-tree.js';

const gridParentPath = appendChildrenPath(ROOT_WIDGET_PATH, 0);

describe('applyWidgetPatch materialization integration', () => {
  it('assigns grid placement when inserting a leaf asset into a grid parent', () => {
    const root: GenericWidget = {
      type: 'column',
      children: [
        {
          type: 'grid',
          columns: 2,
          children: [{ type: 'text', text: 'A', col: 0, row: 0 }],
        },
      ],
    };

    const child = materializeWidgetPlacementAsset(
      {
        id: 'content.body',
        label: 'Body',
        category: 'content',
        kind: 'leaf',
        content: { type: 'text', text: 'B' } as never,
      },
      getWidgetAtPath(root, gridParentPath)!,
    );

    const result = applyWidgetPatch(root, {
      type: 'insert-child',
      parentPath: gridParentPath,
      index: 1,
      child,
    });

    const inserted = getWidgetChildren(getWidgetAtPath(result.root, gridParentPath)!)[1];
    expect(inserted).toMatchObject({ type: 'text', text: 'B', col: 1, row: 0 });
  });

  it('preserves template internals when inserting into a row parent', () => {
    const root: GenericWidget = {
      type: 'column',
      children: [{ type: 'row', gap: 8, children: [] }],
    };
    const rowPath = appendChildrenPath(ROOT_WIDGET_PATH, 0);

    const child = materializeWidgetPlacementAsset(
      {
        id: 'template.section-stack',
        label: 'Section Stack',
        category: 'template',
        kind: 'template',
        content: {
          type: 'column',
          gap: 4,
          children: [
            { type: 'text', text: 'Title', fontSize: 18 },
            { type: 'text', text: 'Body' },
          ],
        } as never,
      },
      getWidgetAtPath(root, rowPath)!,
    );

    const result = applyWidgetPatch(root, {
      type: 'insert-child',
      parentPath: rowPath,
      index: 0,
      child,
    });

    const inserted = getWidgetChildren(getWidgetAtPath(result.root, rowPath)!)[0];
    expect(inserted?.type).toBe('column');
    expect(getWidgetChildren(inserted!)).toHaveLength(2);
    expect(getWidgetChildren(inserted!)[0]).toMatchObject({ type: 'text', text: 'Title' });
  });
});
