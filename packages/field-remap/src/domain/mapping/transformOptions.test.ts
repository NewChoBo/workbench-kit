import { describe, expect, it } from 'vitest';
import {
  contextWithEdgeOptions,
  patchOptionRecord,
  resolveOptionSteps,
  sanitizeOptionRecord,
} from './transformOptions.js';

describe('transformOptions helpers', () => {
  it('merges edge options over context.options', () => {
    expect(
      contextWithEdgeOptions({ options: { maxLength: 24, separator: ', ' } }, { maxLength: 8 })
        .options,
    ).toEqual({ maxLength: 8, separator: ', ' });
  });

  it('sanitizes and patches option records', () => {
    expect(sanitizeOptionRecord({ a: 1, b: undefined })).toEqual({ a: 1 });
    expect(sanitizeOptionRecord({})).toBeUndefined();
    expect(patchOptionRecord({ maxLength: 12 }, 'maxLength', undefined)).toBeUndefined();
    expect(patchOptionRecord({ maxLength: 12 }, 'separator', ' | ')).toEqual({
      maxLength: 12,
      separator: ' | ',
    });
  });

  it('resolves shared options as apply-to-all steps', () => {
    expect(resolveOptionSteps(['identity', 'identity'], undefined, { flag: true })).toEqual([
      { flag: true },
      { flag: true },
    ]);
  });
});
