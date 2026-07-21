import { describe, expect, it } from 'vitest';
import type { WorkbenchDocumentNode } from './schema';

import {
  createWorkbenchCanvasLayoutUpdate,
  getWorkbenchCanvasNodeChildren,
  getWorkbenchCanvasRootNodeIds,
  parseWorkbenchCanvasLayoutNumber,
} from './WorkbenchCanvasShell.model';

describe('WorkbenchCanvasShell model', () => {
  it('finds root nodes without treating nested children as roots', () => {
    const nodes = [
      createNode('root-frame', { children: ['child-text'] }),
      createNode('child-text', { parentId: 'root-frame' }),
      createNode('orphan'),
      createNode('listed-child-only'),
      createNode('root-list', { children: ['listed-child-only'] }),
    ];

    expect(getWorkbenchCanvasRootNodeIds(nodes)).toEqual(['root-frame', 'orphan', 'root-list']);
  });

  it('reads children only from container nodes', () => {
    expect(getWorkbenchCanvasNodeChildren(createNode('frame', { children: ['text'] }))).toEqual([
      'text',
    ]);
    expect(getWorkbenchCanvasNodeChildren(createNode('text'))).toEqual([]);
  });

  it('parses finite layout numbers', () => {
    expect(parseWorkbenchCanvasLayoutNumber(' 12.5 ')).toBe(12.5);
    expect(parseWorkbenchCanvasLayoutNumber('')).toBeUndefined();
    expect(parseWorkbenchCanvasLayoutNumber('abc')).toBeUndefined();
    expect(parseWorkbenchCanvasLayoutNumber('Infinity')).toBeUndefined();
  });

  it('merges valid layout edits over the current layout', () => {
    expect(
      createWorkbenchCanvasLayoutUpdate(
        { x: 1, y: 2, width: 100, height: 80 },
        { x: '10', y: '', width: '240', height: 'bad' },
      ),
    ).toEqual({ x: 10, y: 2, width: 240, height: 80 });
  });
});

function createNode(
  id: string,
  options: { children?: readonly string[]; parentId?: string } = {},
): WorkbenchDocumentNode {
  if (options.children) {
    return {
      id,
      type: 'frame',
      name: id,
      layout: { x: 0, y: 0, width: 100, height: 100 },
      parentId: options.parentId,
      children: [...options.children],
    };
  }

  return {
    id,
    type: 'text',
    name: id,
    layout: { x: 0, y: 0, width: 100, height: 20 },
    parentId: options.parentId,
    content: id,
  };
}
