import { describe, expect, it } from 'vitest';
import { createBuiltinValueTransformRegistry } from '../../registry/builtinTransforms.js';
import { convertMappedInputs } from './convertMappedInputs.js';

describe('convertMappedInputs', () => {
  it('evaluates identity edges', async () => {
    const { output } = await convertMappedInputs({
      sources: [{ id: 'a.name', label: 'name', path: 'name', dataType: 'string' }],
      targets: [{ id: 'b.display', label: 'display', path: 'display', dataType: 'string' }],
      edges: [{ id: 'e1', sourceFieldId: 'a.name', targetSlotId: 'b.display' }],
      inputs: { source: { name: 'Ada' } },
      transforms: createBuiltinValueTransformRegistry(),
      sourceShapeIds: ['source'],
      targetShapeId: 'target',
    });

    expect(output).toEqual({ display: 'Ada' });
  });

  it('evaluates trim/upper transform chains', async () => {
    const { output } = await convertMappedInputs({
      sources: [{ id: 'a.name', label: 'name', path: 'name', dataType: 'string' }],
      targets: [{ id: 'b.display', label: 'display', path: 'display', dataType: 'string' }],
      edges: [
        {
          id: 'e1',
          sourceFieldId: 'a.name',
          targetSlotId: 'b.display',
          transformIds: ['string:trim', 'string:upper'],
        },
      ],
      inputs: { source: { name: '  ada  ' } },
      transforms: createBuiltinValueTransformRegistry(),
      sourceShapeIds: ['source'],
      targetShapeId: 'target',
    });

    expect(output).toEqual({ display: 'ADA' });
  });
});
