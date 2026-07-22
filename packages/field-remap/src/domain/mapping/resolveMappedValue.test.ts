import { describe, expect, it } from 'vitest';
import {
  BUILTIN_TRANSFORM_IDS,
  createBuiltinValueTransformRegistry,
} from '../../registry/builtinTransforms.js';
import { createValueTransformRegistry } from '../../registry/createValueTransformRegistry.js';
import { resolveMappedValue } from './resolveMappedValue.js';

describe('resolveMappedValue', () => {
  const registry = createBuiltinValueTransformRegistry();

  it('passes values through identity / omitted transforms', async () => {
    expect(
      await resolveMappedValue(
        {
          id: 'e1',
          sourceFieldId: 'a.x',
          targetSlotId: 'b.y',
          transformIds: [BUILTIN_TRANSFORM_IDS.identity],
        },
        'hello',
        registry,
      ),
    ).toBe('hello');

    expect(
      await resolveMappedValue(
        {
          id: 'e2',
          sourceFieldId: 'a.x',
          targetSlotId: 'b.y',
          transformId: null,
        },
        22.5,
        registry,
      ),
    ).toBe(22.5);
  });

  it('applies a host-registered transform chain', async () => {
    const custom = createValueTransformRegistry([
      ...registry.list(),
      {
        id: 'string:upper',
        label: 'Uppercase',
        inputTypes: ['string'],
        outputType: 'string',
        apply: (value) => String(value).toUpperCase(),
      },
    ]);

    expect(
      await resolveMappedValue(
        {
          id: 'e3',
          sourceFieldId: 'a.name',
          targetSlotId: 'b.name',
          transformIds: ['string:upper'],
        },
        'ada',
        custom,
      ),
    ).toBe('ADA');
  });
});
