import { describe, expect, it } from 'vitest';

import { screenColumn, screenExpanded, screenPanel, screenRow, screenText } from './builders.js';
import {
  createDefaultScreenNode,
  getScreenNodeAt,
  insertScreenNodeAt,
  listScreenSpecOutline,
  removeScreenNodeAt,
  resolveScreenInsertParentPath,
  screenNodePathToWidgetPath,
  updateScreenNodeAt,
  widgetPathToScreenNodePath,
} from './tree.js';
import type { JdwScreenSpec } from './types.js';

const spec: JdwScreenSpec = {
  id: 'demo',
  title: 'Demo',
  description: 'Demo screen',
  frameWidth: 320,
  layout: { maxWidth: 320, maxHeight: 200 },
  root: screenColumn([screenText('Hello'), screenText('World', { color: '#fff' })], { gap: 8 }),
};

const flexSpec: JdwScreenSpec = {
  id: 'flex-demo',
  title: 'Flex Demo',
  description: '',
  frameWidth: 400,
  layout: { maxWidth: 400, maxHeight: 400 },
  root: screenColumn(
    [
      screenRow([screenText('Title')], { gap: 4 }),
      screenExpanded(screenRow([screenExpanded(screenPanel('Chart'))], { gap: 8 })),
    ],
    { gap: 12 },
  ),
};

describe('screen-spec tree', () => {
  it('lists outline entries depth-first', () => {
    const outline = listScreenSpecOutline(spec);
    expect(outline.map((entry) => entry.label)).toEqual([
      'column (2 children)',
      'text: Hello',
      'text: World',
    ]);
  });

  it('collapses expanded wrappers in the outline', () => {
    const outline = listScreenSpecOutline(flexSpec);
    expect(outline.map((entry) => entry.label)).toEqual([
      'column (2 children)',
      'row (1 children)',
      'text: Title',
      'row (1 children) · flex 1',
      'panel: Chart · flex 1',
    ]);
    expect(outline.some((entry) => entry.label.startsWith('expanded'))).toBe(false);
  });

  it('updates a nested text node by path', () => {
    const updated = updateScreenNodeAt(spec, [1], screenText('Updated', { color: '#fff' }));
    expect(getScreenNodeAt(updated.root, [1])).toEqual({
      kind: 'text',
      content: 'Updated',
      style: { color: '#fff' },
    });
  });

  it('maps screen paths through expanded wrappers to widget paths', () => {
    expect(screenNodePathToWidgetPath(flexSpec.root, [1, 0])).toEqual([
      { kind: 'children', index: 1 },
    ]);
    expect(screenNodePathToWidgetPath(flexSpec.root, [1, 0, 0, 0])).toEqual([
      { kind: 'children', index: 1 },
      { kind: 'children', index: 0 },
    ]);
  });

  it('maps widget paths back onto collapsed expanded screen paths', () => {
    expect(widgetPathToScreenNodePath(flexSpec.root, [{ kind: 'children', index: 1 }])).toEqual([
      1, 0,
    ]);
    expect(
      widgetPathToScreenNodePath(flexSpec.root, [
        { kind: 'children', index: 1 },
        { kind: 'children', index: 0 },
      ]),
    ).toEqual([1, 0, 0, 0]);
  });

  it('inserts a palette node into the selected container', () => {
    const inserted = insertScreenNodeAt(spec, [], createDefaultScreenNode('panel'));
    expect(inserted).not.toBeNull();
    expect(inserted?.insertedPath).toEqual([2]);
    expect(getScreenNodeAt(inserted!.spec.root, [2])).toMatchObject({
      kind: 'panel',
      content: 'Panel',
    });
  });

  it('resolves insert parent from a leaf selection', () => {
    expect(resolveScreenInsertParentPath(spec.root, [1])).toEqual([]);
    expect(resolveScreenInsertParentPath(screenText('solo'), [])).toBeNull();
  });

  it('removes a child and selects a sibling', () => {
    const removed = removeScreenNodeAt(spec, [0]);
    expect(removed).not.toBeNull();
    expect(listScreenSpecOutline(removed!.spec).map((entry) => entry.label)).toEqual([
      'column (1 children)',
      'text: World',
    ]);
    expect(removed?.nextSelectedPath).toEqual([0]);
  });
});
