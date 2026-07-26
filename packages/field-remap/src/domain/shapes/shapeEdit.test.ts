import { describe, expect, it } from 'vitest';
import {
  FIELD_DATA_TYPES,
  isFieldDataType,
  pruneMappingEdgesForShapes,
  setSourceFieldDataType,
  setTargetSlotDataType,
} from './shapeEdit.js';
import type { MappingEdge, SourceField, TargetSlot } from '../types.js';

describe('shapeEdit', () => {
  const sources: SourceField[] = [
    {
      id: 'a.user',
      label: 'user',
      dataType: 'object',
      children: [{ id: 'a.user.name', label: 'name', path: 'user.name', dataType: 'string' }],
    },
    { id: 'a.tags', label: 'tags', path: 'tags', dataType: 'array' },
  ];
  const targets: TargetSlot[] = [
    { id: 'b.name', label: 'name', path: 'name', dataType: 'string' },
    { id: 'b.labels', label: 'labels', path: 'labels', dataType: 'array' },
  ];

  it('lists FieldDataType values', () => {
    expect(FIELD_DATA_TYPES).toContain('string');
    expect(isFieldDataType('array')).toBe(true);
    expect(isFieldDataType('nope')).toBe(false);
  });

  it('prunes edges whose field or slot ids disappeared', () => {
    const edges: MappingEdge[] = [
      { id: 'e1', sourceFieldId: 'a.user.name', targetSlotId: 'b.name' },
      { id: 'e2', sourceFieldId: 'a.missing', targetSlotId: 'b.name' },
      { id: 'e3', sourceFieldId: 'a.tags', targetSlotId: 'b.gone' },
      {
        id: 'e4',
        sourceFieldId: 'a.tags',
        targetSlotId: 'b.labels',
        itemEdges: [
          { id: 'e4i', sourceFieldId: 'a.user.name', targetSlotId: 'b.name' },
          { id: 'e4x', sourceFieldId: 'a.missing', targetSlotId: 'b.name' },
        ],
      },
    ];

    expect(pruneMappingEdgesForShapes(edges, sources, targets)).toEqual([
      { id: 'e1', sourceFieldId: 'a.user.name', targetSlotId: 'b.name' },
      {
        id: 'e4',
        sourceFieldId: 'a.tags',
        targetSlotId: 'b.labels',
        itemEdges: [{ id: 'e4i', sourceFieldId: 'a.user.name', targetSlotId: 'b.name' }],
      },
    ]);
  });

  it('patches nested field and slot data types', () => {
    expect(
      setSourceFieldDataType(sources, 'a.user.name', 'number')[0]?.children?.[0]?.dataType,
    ).toBe('number');
    expect(setTargetSlotDataType(targets, 'b.labels', 'object')[1]?.dataType).toBe('object');
  });
});
