import { describe, expect, it } from 'vitest';
import {
  attachShapeIdToSourceFields,
  createDataShapeRegistry,
  defineDataShape,
  mergeSourceShapes,
  targetSlotsFromShape,
} from './dataShape.js';
import type { SourceField } from '../types.js';

describe('dataShape', () => {
  it('defineDataShape trims id/label and rejects empty id', () => {
    expect(
      defineDataShape({ id: ' order ', label: ' Order ', role: 'source', fields: [] }),
    ).toEqual({
      id: 'order',
      label: 'Order',
      role: 'source',
      fields: [],
    });
    expect(() => defineDataShape({ id: '  ', label: 'X', role: 'source', fields: [] })).toThrow(
      /non-empty/,
    );
  });

  it('registry register/get/list by role', () => {
    const registry = createDataShapeRegistry([
      { id: 'a', label: 'A', role: 'source', fields: [] },
      { id: 'b', label: 'B', role: 'target', fields: [] },
      { id: 'c', label: 'C', role: 'both', fields: [] },
    ]);
    expect(registry.get('a')?.label).toBe('A');
    expect(
      registry
        .list('source')
        .map((s) => s.id)
        .sort(),
    ).toEqual(['a', 'c']);
    expect(
      registry
        .list('target')
        .map((s) => s.id)
        .sort(),
    ).toEqual(['b', 'c']);
  });

  it('attachShapeIdToSourceFields stamps descendants', () => {
    const fields: SourceField[] = [
      {
        id: 'root',
        label: 'root',
        children: [{ id: 'leaf', label: 'leaf', path: 'leaf', dataType: 'string' }],
      },
    ];
    const stamped = attachShapeIdToSourceFields(fields, 'order');
    expect(stamped[0]?.shapeId).toBe('order');
    expect(stamped[0]?.children?.[0]?.shapeId).toBe('order');
  });

  it('mergeSourceShapes wraps shapes as groups', () => {
    const merged = mergeSourceShapes([
      {
        id: 'clock',
        label: 'Clock',
        role: 'source',
        fields: [{ id: 'now', label: 'now', path: 'now', dataType: 'datetime' }],
      },
      {
        id: 'display',
        label: 'Display',
        role: 'target',
        fields: [{ id: 't', label: 't', dataType: 'string' }],
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe('shape.clock');
    expect(merged[0]?.children?.[0]?.shapeId).toBe('clock');
  });

  it('targetSlotsFromShape rejects source-only shapes', () => {
    expect(() => targetSlotsFromShape({ id: 'a', label: 'A', role: 'source', fields: [] })).toThrow(
      /cannot provide target/,
    );
  });
});
