import { describe, expect, it } from 'vitest';

import { validatePackedPackageCohort } from './packed-package-cohort.mjs';

const version = '1.2.3-prototype.0';
const packageNames = ['@workbench-kit/base', '@workbench-kit/react'];

describe('packed package cohort', () => {
  it('accepts one exact published version cohort', () => {
    const manifests = new Map([
      ['@workbench-kit/base', { name: '@workbench-kit/base', version }],
      [
        '@workbench-kit/react',
        {
          dependencies: { '@workbench-kit/base': version },
          name: '@workbench-kit/react',
          version,
        },
      ],
    ]);

    expect(
      validatePackedPackageCohort({
        expectedPackageNames: packageNames,
        expectedVersion: version,
        manifests,
      }),
    ).toBe(2);
  });

  it('rejects missing and mismatched packed package versions', () => {
    const manifests = new Map([
      ['@workbench-kit/base', { name: '@workbench-kit/base', version: '1.2.2' }],
    ]);

    expect(() =>
      validatePackedPackageCohort({
        expectedPackageNames: packageNames,
        expectedVersion: version,
        manifests,
      }),
    ).toThrowError(
      [
        '@workbench-kit/base: packed version 1.2.2 does not match 1.2.3-prototype.0',
        '@workbench-kit/react: packed manifest is missing',
      ].join('\n'),
    );
  });

  it('rejects workspace protocols and dependencies outside the public cohort', () => {
    const manifests = new Map([
      ['@workbench-kit/base', { name: '@workbench-kit/base', version }],
      [
        '@workbench-kit/react',
        {
          dependencies: {
            '@workbench-kit/base': 'workspace:*',
            '@workbench-kit/private-runtime': version,
          },
          name: '@workbench-kit/react',
          version,
        },
      ],
    ]);

    expect(() =>
      validatePackedPackageCohort({
        expectedPackageNames: packageNames,
        expectedVersion: version,
        manifests,
      }),
    ).toThrowError(
      [
        '@workbench-kit/react: dependencies.@workbench-kit/base retains workspace:*',
        '@workbench-kit/react: dependencies.@workbench-kit/base is workspace:*, expected 1.2.3-prototype.0',
        '@workbench-kit/react: dependencies references unpublished @workbench-kit/private-runtime',
      ].join('\n'),
    );
  });
});
