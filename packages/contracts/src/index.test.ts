import { describe, expect, it } from 'vitest';
import {
  isPatchSuccess,
  isSaveFailure,
  isSaveSuccess,
  isWorkspacePatchDeleteFile,
  isWorkspacePatchWriteFile,
} from './index';

const writePatch = {
  content: 'updated',
  path: 'src/index.ts',
  type: 'write-file' as const,
};

const deletePatch = {
  path: 'src/legacy.ts',
  type: 'delete-file' as const,
};

describe('contract helpers', () => {
  it('classifies patch event variant', () => {
    expect(isWorkspacePatchDeleteFile(writePatch)).toBe(false);
    expect(isWorkspacePatchWriteFile(writePatch)).toBe(true);
    expect(isWorkspacePatchDeleteFile(deletePatch)).toBe(true);
    expect(isWorkspacePatchWriteFile(deletePatch)).toBe(false);
  });

  it('classifies patch application result', () => {
    expect(
      isPatchSuccess({
        patch: writePatch,
        type: 'patch:applied',
      }),
    ).toBe(true);

    expect(
      isPatchSuccess({
        code: 'invalid-path',
        patch: deletePatch,
        message: 'path missing',
        type: 'patch:failed',
      }),
    ).toBe(false);
  });

  it('classifies save outcomes as success/failure unions', () => {
    const success = {
      file: {
        content: 'ok',
        path: 'src/index.ts',
      },
      kind: 'save:success' as const,
      outcome: 'updated' as const,
    };
    const failure = {
      code: 'path-conflict' as const,
      kind: 'save:failure' as const,
      message: 'conflict',
      path: 'src/index.ts',
    };

    expect(isSaveSuccess(success)).toBe(true);
    expect(isSaveSuccess(failure)).toBe(false);
    expect(isSaveFailure(success)).toBe(false);
    expect(isSaveFailure(failure)).toBe(true);
  });
});
