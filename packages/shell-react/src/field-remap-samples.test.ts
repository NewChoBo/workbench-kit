import { describe, expect, it } from 'vitest';
import {
  convertToShape,
  createBuiltinValueTransformRegistry,
  defineConversion,
  defineDataShape,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
} from '@workbench-kit/field-remap';

import { FIELD_REMAP_SAMPLES, getFieldRemapSample } from './field-remap-samples.js';

async function convertSample(sampleId: string) {
  const sample = getFieldRemapSample(sampleId);
  const sources = sourceFieldsFromPlainObject(sample.source, {
    idPrefix: sample.sourceIdPrefix,
  });
  const targets = targetSlotsFromPlainObject(sample.targetShape, {
    idPrefix: sample.targetIdPrefix,
  });
  return await convertToShape({
    conversion: defineConversion({
      id: sample.id,
      sourceShapeIds: [sample.sourceIdPrefix],
      targetShapeId: sample.targetIdPrefix,
      edges: [...sample.edges],
    }),
    shapes: [
      defineDataShape({
        id: sample.sourceIdPrefix,
        label: sample.sourceLabel,
        role: 'source',
        fields: sources,
      }),
      defineDataShape({
        id: sample.targetIdPrefix,
        label: sample.targetLabel,
        role: 'target',
        fields: targets,
      }),
    ],
    inputs: { [sample.sourceIdPrefix]: sample.source },
    transforms: createBuiltinValueTransformRegistry(),
  });
}

describe('FIELD_REMAP_SAMPLES', () => {
  it('lists five catalog entries', async () => {
    expect(FIELD_REMAP_SAMPLES.map((sample) => sample.id)).toEqual([
      'nested-ab',
      't-user-contact',
      't-event-time',
      't-emp-dept',
      't-product-catalog',
    ]);
  });

  it('maps nested-ab with object port and formats', async () => {
    const { output } = await convertSample('nested-ab');
    expect(output).toMatchObject({
      name: 'Ada Lovelace',
      title: 'ADA LOVELACE',
      location: { city: 'London', country: 'UK' },
      tagLine: 'math · computing',
    });
  });

  it('builds fullName from NAME object template', async () => {
    const { output } = await convertSample('t-user-contact');
    expect(output).toEqual({
      id: 1001,
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '555-0100',
    });
  });

  it('reformats, combines, and splits date/time', async () => {
    const { output } = await convertSample('t-event-time');
    expect(output).toEqual({
      eventId: 'EV-7',
      displayDate: '2026.07.20',
      startsAt: '2026-07-20T14:30:00',
      occurDate: '2026-07-21',
      occurTime: '09:15:00',
    });
  });

  it('flattens T_EMP → T_EMP_ROW', async () => {
    const { output } = await convertSample('t-emp-dept');
    expect(output).toEqual({
      empNo: 'E-42',
      empName: 'Grace Hopper',
      deptCode: 'RND',
      deptName: 'RESEARCH',
    });
  });

  it('maps T_PRODUCT tags via itemEdges', async () => {
    const { output } = await convertSample('t-product-catalog');
    expect(output).toMatchObject({
      productId: 'P-9',
      name: 'Analytical Engine',
      tagLine: 'history / computing',
      labels: [
        { code: 'HIST', title: 'history' },
        { code: 'COMP', title: 'computing' },
      ],
    });
  });
});
