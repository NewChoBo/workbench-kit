import { describe, expect, it } from 'vitest';
import {
  applyMappingOperators,
  convertToShape,
  createBuiltinValueTransformRegistry,
  defineConversion,
  defineDataShape,
  normalizeMappingOperators,
  sourceFieldsFromPlainObject,
  targetSlotsFromPlainObject,
} from '@workbench-kit/field-remap';

import { FIELD_REMAP_SAMPLES, getFieldRemapSample } from './samples.js';

async function convertSample(sampleId: string) {
  const sample = getFieldRemapSample(sampleId);
  const sources = sourceFieldsFromPlainObject(sample.source, {
    idPrefix: sample.sourceIdPrefix,
  });
  const targets = targetSlotsFromPlainObject(sample.targetShape, {
    idPrefix: sample.targetIdPrefix,
  });
  const transforms = createBuiltinValueTransformRegistry();
  const shaped = await convertToShape({
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
    transforms,
  });
  const operators = normalizeMappingOperators(sample.operators);
  if (!operators?.length) {
    return shaped;
  }
  return await applyMappingOperators({
    operators,
    sources,
    targets,
    inputs: { [sample.sourceIdPrefix]: sample.source },
    transforms,
    output: shaped.output,
  });
}

describe('FIELD_REMAP_SAMPLES', () => {
  it('lists catalog entries including n→m operators', async () => {
    expect(FIELD_REMAP_SAMPLES.map((sample) => sample.id)).toEqual([
      'nested-ab',
      't-user-contact',
      't-event-time',
      't-emp-dept',
      't-product-catalog',
      'nm-combine-split',
    ]);
  });

  it('maps nested-ab with convert chains, leaf location, and array reduces', async () => {
    const { output } = await convertSample('nested-ab');
    expect(output).toMatchObject({
      name: 'Ada Lovelace',
      title: 'ADA LOVELACE',
      location: { city: 'LONDON', country: 'UK' },
      firstTag: 'math',
      tagLine: 'math · computing',
      labels: [
        { title: 'math', order: 1 },
        { title: 'computing', order: 2 },
      ],
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

  it('applies document v2 combine and split operators', async () => {
    const { output } = await convertSample('nm-combine-split');
    expect(output).toEqual({
      nameBag: { first: 'Ada', last: 'Lovelace' },
      city: 'London',
      zip: 'E1',
    });
  });
});
