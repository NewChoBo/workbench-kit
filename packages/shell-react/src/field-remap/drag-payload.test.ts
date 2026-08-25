import { describe, expect, it } from 'vitest';

import {
  readFieldRemapTransformDragData,
  writeFieldRemapTransformDragData,
} from './drag-payload.js';

function createDataTransfer(initial: Readonly<Record<string, string>> = {}) {
  const entries = new Map(Object.entries(initial));
  const dataTransfer: Pick<DataTransfer, 'getData' | 'setData' | 'types'> = {
    get types() {
      return [...entries.keys()];
    },
    getData: (type) => entries.get(type) ?? '',
    setData: (type, value) => {
      entries.set(type, value);
    },
  };
  return { dataTransfer, entries };
}

describe('Field Remap private transform drag payload', () => {
  it('round-trips only the transform id in one private data type', () => {
    const { dataTransfer, entries } = createDataTransfer();

    writeFieldRemapTransformDragData(dataTransfer, 'string:trim');

    expect(entries).toHaveLength(1);
    expect(JSON.parse([...entries.values()][0]!)).toEqual({ transformId: 'string:trim' });
    expect(readFieldRemapTransformDragData(dataTransfer)).toBe('string:trim');
  });

  it.each([
    ['foreign type', { 'text/plain': 'string:trim' }],
    ['invalid JSON', { 'application/x-workbench-field-remap-transform': '{' }],
    ['non-object', { 'application/x-workbench-field-remap-transform': '"string:trim"' }],
    ['array', { 'application/x-workbench-field-remap-transform': '["string:trim"]' }],
    ['missing id', { 'application/x-workbench-field-remap-transform': '{}' }],
    [
      'extra key',
      {
        'application/x-workbench-field-remap-transform':
          '{"transformId":"string:trim","source":"foreign"}',
      },
    ],
    ['non-string id', { 'application/x-workbench-field-remap-transform': '{"transformId":1}' }],
    ['empty id', { 'application/x-workbench-field-remap-transform': '{"transformId":""}' }],
  ])('rejects %s payloads before registry lookup', (_label, initial) => {
    const { dataTransfer } = createDataTransfer(initial);
    expect(readFieldRemapTransformDragData(dataTransfer)).toBeUndefined();
  });
});
