import { describe, expect, it } from 'vitest';
import {
  createConversionRegistry,
  defineConversion,
  withConversionEdges,
} from './conversionDefinition.js';

describe('conversionDefinition', () => {
  it('defineConversion builds a normalized document from edges', () => {
    const conversion = defineConversion({
      id: ' order+customer→invoice ',
      label: ' Invoice projection ',
      sourceShapeIds: ['order', 'customer'],
      targetShapeId: 'invoice',
      edges: [
        {
          id: 'e1',
          sourceFieldId: 'order.id',
          targetSlotId: 'invoice.title',
          transformIds: ['identity'],
        },
      ],
    });
    expect(conversion.id).toBe('order+customer→invoice');
    expect(conversion.label).toBe('Invoice projection');
    expect(conversion.sourceShapeIds).toEqual(['order', 'customer']);
    expect(conversion.document.version).toBe(2);
    expect(conversion.document.edges).toHaveLength(1);
  });

  it('rejects empty source list / ids', () => {
    expect(() =>
      defineConversion({
        id: 'x',
        sourceShapeIds: [],
        targetShapeId: 'display',
      }),
    ).toThrow(/sourceShapeIds/);
    expect(() =>
      defineConversion({
        id: ' ',
        sourceShapeIds: ['a'],
        targetShapeId: 'b',
      }),
    ).toThrow(/id must be/);
  });

  it('registry and withConversionEdges', () => {
    const registry = createConversionRegistry([
      defineConversion({
        id: 'c1',
        sourceShapeIds: ['a'],
        targetShapeId: 'b',
        edges: [],
      }),
    ]);
    expect(registry.get('c1')?.targetShapeId).toBe('b');
    const next = withConversionEdges(registry.get('c1')!, [
      { id: 'e', sourceFieldId: 's', targetSlotId: 't' },
    ]);
    expect(next.document.edges).toHaveLength(1);
    expect(registry.get('c1')?.document.edges).toHaveLength(0);
  });
});
