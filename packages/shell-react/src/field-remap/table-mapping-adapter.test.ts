import { describe, expect, it } from 'vitest';
import {
  edgesToTableMappings,
  fromTableMappingFieldId,
  tableMappingsToEdges,
  toTableMappingFieldId,
  toTableMappingFields,
} from './table-mapping-adapter.js';

describe('table-mapping-adapter', () => {
  it('encodes dotted kit ids for CSS-safe connector selectors', () => {
    expect(toTableMappingFieldId('a.user_name')).toBe('a__user_name');
    expect(fromTableMappingFieldId('a__user_name')).toBe('a.user_name');
  });

  it('builds string field rows from leaves with encoded ids', () => {
    expect(
      toTableMappingFields([
        { id: 'a.user_name', label: 'user_name' },
        { id: 'b.name', label: 'name' },
      ]),
    ).toEqual([
      {
        id: 'a__user_name',
        key: 'a__user_name',
        name: { type: 'string', columnKey: 'name', value: 'user_name' },
      },
      {
        id: 'b__name',
        key: 'b__name',
        name: { type: 'string', columnKey: 'name', value: 'name' },
      },
    ]);
  });

  it('round-trips mappings and edges across id encoding', () => {
    const edges = tableMappingsToEdges([
      { id: 'e-name', source: 'a__user_name', target: 'b__name' },
    ]);
    expect(edges).toEqual([
      {
        id: 'e-name',
        sourceFieldId: 'a.user_name',
        targetSlotId: 'b.name',
        transformIds: ['identity'],
      },
    ]);
    expect(edgesToTableMappings(edges)).toEqual([
      { id: 'e-name', source: 'a__user_name', target: 'b__name' },
    ]);
  });
});
