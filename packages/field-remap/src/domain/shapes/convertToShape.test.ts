import { describe, expect, it } from 'vitest';
import { createBuiltinValueTransformRegistry } from '../../registry/builtinTransforms.js';
import { sourceFieldsFromPlainObject } from '../ingest/sourceFieldsFromPlainObject.js';
import { targetSlotsFromPlainObject } from '../ingest/targetSlotsFromPlainObject.js';
import { defineConversion } from './conversionDefinition.js';
import { convertToShape } from './convertToShape.js';
import { defineDataShape } from './dataShape.js';

describe('convertToShape', () => {
  it('renames fields from structure A into structure B', async () => {
    const structureA = {
      user_name: 'Ada Lovelace',
      user_email: 'ada@example.com',
      age_years: 36,
    };

    const shapes = [
      defineDataShape({
        id: 'a',
        label: 'A',
        role: 'source',
        fields: sourceFieldsFromPlainObject(structureA, { idPrefix: 'a' }),
      }),
      defineDataShape({
        id: 'b',
        label: 'B',
        role: 'target',
        fields: targetSlotsFromPlainObject({ name: '', email: '', age: 0 }, { idPrefix: 'b' }),
      }),
    ];

    const conversion = defineConversion({
      id: 'a→b',
      sourceShapeIds: ['a'],
      targetShapeId: 'b',
      edges: [
        {
          id: 'e-name',
          sourceFieldId: 'a.user_name',
          targetSlotId: 'b.name',
          transformIds: ['identity'],
        },
        {
          id: 'e-email',
          sourceFieldId: 'a.user_email',
          targetSlotId: 'b.email',
          transformIds: ['identity'],
        },
        {
          id: 'e-age',
          sourceFieldId: 'a.age_years',
          targetSlotId: 'b.age',
          transformIds: ['identity'],
        },
      ],
    });

    const { output } = await convertToShape({
      conversion,
      shapes,
      inputs: { a: structureA },
      transforms: createBuiltinValueTransformRegistry(),
    });

    expect(output).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      age: 36,
    });
  });
});
