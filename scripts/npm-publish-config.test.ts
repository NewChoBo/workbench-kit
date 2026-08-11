import { describe, expect, it, vi } from 'vitest';

import { npmViewExists } from './npm-publish-config.mjs';

describe('npmViewExists', () => {
  it('reports an existing package version', () => {
    const run = vi.fn();

    expect(npmViewExists('@workbench-kit/base@1.2.3', undefined, run)).toBe(true);
    expect(run).toHaveBeenCalledWith(
      'npm',
      ['view', '@workbench-kit/base@1.2.3', 'version', '--registry', 'https://registry.npmjs.org/'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  });

  it('classifies npm E404 as an unpublished package version', () => {
    const error = Object.assign(new Error('npm view failed'), {
      stderr: 'npm error code E404\nnpm error 404 Not Found',
    });
    const run = vi.fn(() => {
      throw error;
    });

    expect(npmViewExists('@workbench-kit/base@9.9.9', undefined, run)).toBe(false);
  });

  it.each(['E401', 'ENETUNREACH', 'ECONNRESET'])(
    'fails closed for an unclassified %s registry error',
    (errorCode) => {
      const cause = Object.assign(new Error('npm view failed'), {
        stderr: `npm error code ${errorCode}`,
      });
      const run = vi.fn(() => {
        throw cause;
      });

      expect(() => npmViewExists('@workbench-kit/base@1.2.3', undefined, run)).toThrow(
        'refusing to treat the package as unpublished',
      );

      try {
        npmViewExists('@workbench-kit/base@1.2.3', undefined, run);
      } catch (error) {
        expect(error).toHaveProperty('cause', cause);
      }
    },
  );
});
