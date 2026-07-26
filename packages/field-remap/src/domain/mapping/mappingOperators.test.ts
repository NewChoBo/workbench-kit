import { describe, expect, it } from 'vitest';
import { createBuiltinValueTransformRegistry } from '../../registry/builtinTransforms.js';
import {
  applyMappingOperators,
  MappingOperatorError,
  MAX_MAPPING_FAN_IN,
} from './mappingOperators.js';
import type { SourceField, TargetSlot } from '../types.js';

describe('mappingOperators', () => {
  const sources: SourceField[] = [
    { id: 'a.date', label: 'date', path: 'date', dataType: 'date' },
    { id: 'a.time', label: 'time', path: 'time', dataType: 'time' },
    { id: 'a.when', label: 'when', path: 'when', dataType: 'object' },
  ];
  const targets: TargetSlot[] = [
    { id: 'b.startsAt', label: 'startsAt', path: 'startsAt', dataType: 'datetime' },
    { id: 'b.date', label: 'date', path: 'date', dataType: 'date' },
    { id: 'b.time', label: 'time', path: 'time', dataType: 'time' },
  ];
  const transforms = createBuiltinValueTransformRegistry();

  it('combines multiple source fields into one target slot', async () => {
    const { output } = await applyMappingOperators({
      operators: [
        {
          kind: 'combine',
          id: 'op-combine',
          inputFieldIds: ['a.date', 'a.time'],
          outputSlotId: 'b.startsAt',
          transformIds: ['datetime:combine'],
        },
      ],
      sources,
      targets,
      inputs: { a: { date: '2026-07-20', time: '14:30:00' } },
      transforms,
    });
    expect(output).toEqual({ startsAt: '2026-07-20T14:30:00' });
  });

  it('splits one object source into multiple target slots', async () => {
    const { output } = await applyMappingOperators({
      operators: [
        {
          kind: 'split',
          id: 'op-split',
          inputFieldId: 'a.when',
          outputSlotIds: ['b.date', 'b.time'],
        },
      ],
      sources,
      targets,
      inputs: { a: { when: { date: '2026-07-21', time: '09:15:00' } } },
      transforms,
    });
    expect(output).toEqual({ date: '2026-07-21', time: '09:15:00' });
  });

  it('enforces fan-in limits', async () => {
    const many = Array.from({ length: MAX_MAPPING_FAN_IN + 1 }, (_, index) => `a.f${index}`);
    await expect(
      applyMappingOperators({
        operators: [
          {
            kind: 'combine',
            id: 'op-too-wide',
            inputFieldIds: many,
            outputSlotId: 'b.startsAt',
          },
        ],
        sources,
        targets,
        inputs: { a: {} },
        transforms,
      }),
    ).rejects.toBeInstanceOf(MappingOperatorError);
  });
});
