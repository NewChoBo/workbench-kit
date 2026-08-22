import { describe, expect, it } from 'vitest';
import type { ConvertToShapeResult } from '@workbench-kit/field-remap';

import { resolveFieldRemapPreviewProjection, type FieldRemapPreviewState } from './preview.js';

const result: ConvertToShapeResult = {
  output: { name: 'operator-final' },
  slots: [
    {
      edgeId: 'e-name',
      targetSlotId: 'target.name',
      path: 'name',
      value: 'edge-final',
    },
  ],
};
const ready: FieldRemapPreviewState = { status: 'ready', result };

describe('Field Remap preview projection', () => {
  it('separates binding-local values from post-operator document output', () => {
    expect(resolveFieldRemapPreviewProjection(ready, null, false)).toEqual({
      status: 'value',
      scope: 'document',
      value: result.output,
    });
    expect(
      resolveFieldRemapPreviewProjection(ready, { kind: 'edge', edgeId: 'e-name' }, false),
    ).toEqual({
      status: 'value',
      scope: 'binding',
      value: 'edge-final',
    });
    expect(
      resolveFieldRemapPreviewProjection(ready, { kind: 'operator', operatorId: 'op-name' }, true),
    ).toEqual({
      status: 'value',
      scope: 'document',
      value: result.output,
      notice: 'operator-intermediate',
    });
  });

  it('uses final binding values for transform steps without claiming intermediates', () => {
    expect(
      resolveFieldRemapPreviewProjection(
        ready,
        { kind: 'transformStep', edgeId: 'e-name', stepIndex: 0 },
        false,
      ),
    ).toEqual({
      status: 'value',
      scope: 'binding',
      value: 'edge-final',
      notice: 'transform-step-intermediate',
    });
  });

  it('keeps drafts and stale selections deterministic and unsupported', () => {
    expect(
      resolveFieldRemapPreviewProjection(ready, { kind: 'draft', localId: 'draft-1' }, false),
    ).toEqual({ status: 'unsupported', reason: 'draft' });
    expect(
      resolveFieldRemapPreviewProjection(ready, { kind: 'edge', edgeId: 'missing' }, false),
    ).toEqual({ status: 'unsupported', reason: 'stale-selection' });
    expect(
      resolveFieldRemapPreviewProjection(ready, { kind: 'operator', operatorId: 'missing' }, false),
    ).toEqual({ status: 'unsupported', reason: 'stale-selection' });
  });
});
