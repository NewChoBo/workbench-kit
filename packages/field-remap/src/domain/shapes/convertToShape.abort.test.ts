import { describe, expect, it } from 'vitest';

import { createValueTransformRegistry } from '../../registry/createValueTransformRegistry.js';
import { isAbortError } from '../abort.js';
import { sourceFieldsFromPlainObject } from '../ingest/sourceFieldsFromPlainObject.js';
import { targetSlotsFromPlainObject } from '../ingest/targetSlotsFromPlainObject.js';
import { defineConversion } from './conversionDefinition.js';
import { convertToShape } from './convertToShape.js';
import { defineDataShape } from './dataShape.js';

describe('convertToShape AbortSignal', () => {
  it('rejects before applying further edges when aborted mid-conversion', async () => {
    const structureA = { left: 'L', right: 'R' };
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
        fields: targetSlotsFromPlainObject({ left: '', right: '' }, { idPrefix: 'b' }),
      }),
    ];

    const controller = new AbortController();
    const transforms = createValueTransformRegistry([
      {
        id: 'abort-after',
        label: 'Abort after',
        apply: (value) => {
          controller.abort();
          return value;
        },
      },
    ]);

    const conversion = defineConversion({
      id: 'a→b',
      sourceShapeIds: ['a'],
      targetShapeId: 'b',
      edges: [
        {
          id: 'e-left',
          sourceFieldId: 'a.left',
          targetSlotId: 'b.left',
          transformIds: ['abort-after'],
        },
        {
          id: 'e-right',
          sourceFieldId: 'a.right',
          targetSlotId: 'b.right',
          transformIds: ['abort-after'],
        },
      ],
    });

    await expect(
      convertToShape({
        conversion,
        shapes,
        inputs: { a: structureA },
        transforms,
        signal: controller.signal,
      }),
    ).rejects.toSatisfy((error: unknown) => isAbortError(error));
  });
});
