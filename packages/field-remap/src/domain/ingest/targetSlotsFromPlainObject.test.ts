import { describe, expect, it } from 'vitest';
import { targetSlotsFromPlainObject } from './targetSlotsFromPlainObject.js';

describe('targetSlotsFromPlainObject', () => {
  it('returns empty for non-objects', () => {
    expect(targetSlotsFromPlainObject(null)).toEqual([]);
    expect(targetSlotsFromPlainObject('x')).toEqual([]);
    expect(targetSlotsFromPlainObject([1, 2])).toEqual([]);
  });

  it('mirrors source nesting with path (no sampleValue)', () => {
    const slots = targetSlotsFromPlainObject(
      {
        display: { timeText: '15:04', dateText: '2026-07-19' },
        metrics: { tempC: 22.5, tags: [{ name: 'alpha' }] },
      },
      { idPrefix: 'slot' },
    );

    expect(slots.map((slot) => slot.id)).toEqual(['slot.display', 'slot.metrics']);
    expect(slots[0]?.dataType).toBe('object');
    expect(slots[0]?.children?.map((child) => child.label)).toEqual(['timeText', 'dateText']);
    expect(slots[0]?.children?.[0]).toEqual({
      id: 'slot.display.timeText',
      label: 'timeText',
      path: 'display.timeText',
      dataType: 'string',
    });
    expect(slots[1]?.children?.find((child) => child.label === 'tags')?.children).toEqual([
      {
        id: 'slot.metrics.tags.item.name',
        label: 'name',
        path: 'name',
        dataType: 'string',
      },
    ]);
  });

  it('respects maxDepth', () => {
    const slots = targetSlotsFromPlainObject({ a: { b: { c: 1 } } }, { maxDepth: 0 });
    expect(slots[0]?.children).toBeUndefined();
  });
});
