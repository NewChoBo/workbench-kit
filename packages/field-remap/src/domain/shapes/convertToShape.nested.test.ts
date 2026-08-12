import { describe, expect, it } from 'vitest';
import { createBuiltinValueTransformRegistry } from '../../registry/builtinTransforms.js';
import { sourceFieldsFromPlainObject } from '../ingest/sourceFieldsFromPlainObject.js';
import { targetSlotsFromPlainObject } from '../ingest/targetSlotsFromPlainObject.js';
import { defineConversion } from './conversionDefinition.js';
import { convertToShape } from './convertToShape.js';
import { defineDataShape } from './dataShape.js';

const STRUCTURE_A = {
  user_name: 'Ada Lovelace',
  profile: { city: 'London', country: 'UK' },
  tags: [
    { name: 'math', rank: 1 },
    { name: 'computing', rank: 2 },
  ],
};

const STRUCTURE_B_SHAPE = {
  name: '',
  location: { city: '', country: '' },
  labels: [{ title: '', order: 0 }],
  tagNames: '',
};

describe('convertToShape nested + list context', () => {
  const shapes = [
    defineDataShape({
      id: 'a',
      label: 'A',
      role: 'source',
      fields: sourceFieldsFromPlainObject(STRUCTURE_A, { idPrefix: 'a' }),
    }),
    defineDataShape({
      id: 'b',
      label: 'B',
      role: 'target',
      fields: targetSlotsFromPlainObject(STRUCTURE_B_SHAPE, { idPrefix: 'b' }),
    }),
  ];

  it('maps nested object leaves via dotted paths', async () => {
    const conversion = defineConversion({
      id: 'nested',
      sourceShapeIds: ['a'],
      targetShapeId: 'b',
      edges: [
        {
          id: 'e-name',
          sourceFieldId: 'a.user_name',
          targetSlotId: 'b.name',
        },
        {
          id: 'e-city',
          sourceFieldId: 'a.profile.city',
          targetSlotId: 'b.location.city',
        },
        {
          id: 'e-country',
          sourceFieldId: 'a.profile.country',
          targetSlotId: 'b.location.country',
        },
      ],
    });

    const { output } = await convertToShape({
      conversion,
      shapes,
      inputs: { a: STRUCTURE_A },
      transforms: createBuiltinValueTransformRegistry(),
    });

    expect(output).toEqual({
      name: 'Ada Lovelace',
      location: { city: 'London', country: 'UK' },
    });
  });

  it('projects array items with itemSourcePath then joins', async () => {
    const conversion = defineConversion({
      id: 'project',
      sourceShapeIds: ['a'],
      targetShapeId: 'b',
      edges: [
        {
          id: 'e-tags',
          sourceFieldId: 'a.tags',
          targetSlotId: 'b.tagNames',
          itemSourcePath: 'name',
          transformIds: ['array:join'],
          transformOptionSteps: [{ separator: ' | ' }],
        },
      ],
    });

    const { output } = await convertToShape({
      conversion,
      shapes,
      inputs: { a: STRUCTURE_A },
      transforms: createBuiltinValueTransformRegistry(),
    });

    expect(output).toEqual({ tagNames: 'math | computing' });
  });

  it('converts array-of-object → array-of-object via itemEdges (list context)', async () => {
    const conversion = defineConversion({
      id: 'list',
      sourceShapeIds: ['a'],
      targetShapeId: 'b',
      edges: [
        {
          id: 'e-tags',
          sourceFieldId: 'a.tags',
          targetSlotId: 'b.labels',
          itemEdges: [
            {
              id: 'e-title',
              sourceFieldId: 'a.tags.item.name',
              targetSlotId: 'b.labels.item.title',
            },
            {
              id: 'e-order',
              sourceFieldId: 'a.tags.item.rank',
              targetSlotId: 'b.labels.item.order',
            },
          ],
        },
      ],
    });

    const { output } = await convertToShape({
      conversion,
      shapes,
      inputs: { a: STRUCTURE_A },
      transforms: createBuiltinValueTransformRegistry(),
    });

    expect(output).toEqual({
      labels: [
        { title: 'math', order: 1 },
        { title: 'computing', order: 2 },
      ],
    });
  });

  it('applies string format transform chains', async () => {
    const padded = {
      user_name: '  Ada Lovelace  ',
      tags: STRUCTURE_A.tags,
      profile: STRUCTURE_A.profile,
    };
    const shapesWithPad = [
      defineDataShape({
        id: 'a',
        label: 'A',
        role: 'source',
        fields: sourceFieldsFromPlainObject(padded, { idPrefix: 'a' }),
      }),
      shapes[1]!,
    ];
    const conversion = defineConversion({
      id: 'format',
      sourceShapeIds: ['a'],
      targetShapeId: 'b',
      edges: [
        {
          id: 'e-name',
          sourceFieldId: 'a.user_name',
          targetSlotId: 'b.name',
          transformIds: ['string:trim'],
        },
        {
          id: 'e-title',
          sourceFieldId: 'a.user_name',
          targetSlotId: 'b.location.city',
          transformIds: ['string:trim', 'string:upper'],
        },
      ],
    });

    const { output } = await convertToShape({
      conversion,
      shapes: shapesWithPad,
      inputs: { a: padded },
      transforms: createBuiltinValueTransformRegistry(),
    });

    expect(output).toEqual({
      name: 'Ada Lovelace',
      location: { city: 'ADA LOVELACE' },
    });
  });

  it('passes whole arrays with identity', async () => {
    const conversion = defineConversion({
      id: 'whole',
      sourceShapeIds: ['a'],
      targetShapeId: 'b',
      edges: [
        {
          id: 'e-tags',
          sourceFieldId: 'a.tags',
          targetSlotId: 'b.labels',
        },
      ],
    });

    const { output } = await convertToShape({
      conversion,
      shapes,
      inputs: { a: STRUCTURE_A },
      transforms: createBuiltinValueTransformRegistry(),
    });

    expect(output).toEqual({ labels: STRUCTURE_A.tags });
  });
});
