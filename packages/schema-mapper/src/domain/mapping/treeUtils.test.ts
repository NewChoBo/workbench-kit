import { describe, expect, it } from 'vitest';
import { flattenSourceFields, flattenTargetSlots, findTargetSlot } from './treeUtils.js';

describe('treeUtils', () => {
  it('flattens nested source fields', () => {
    const flat = flattenSourceFields([
      {
        id: 'a',
        label: 'A',
        children: [{ id: 'a.b', label: 'B', path: 'b' }],
      },
    ]);
    expect(flat.map((f) => f.id)).toEqual(['a', 'a.b']);
  });

  it('finds target slots by id', () => {
    const slots = [
      {
        id: 'b',
        label: 'B',
        children: [{ id: 'b.name', label: 'name', path: 'name' }],
      },
    ];
    expect(flattenTargetSlots(slots)).toHaveLength(2);
    expect(findTargetSlot(slots, 'b.name')?.path).toBe('name');
  });
});
