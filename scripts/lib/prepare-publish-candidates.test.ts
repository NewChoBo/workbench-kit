import { describe, expect, it, vi } from 'vitest';

import { preparePublishCandidates } from './prepare-publish-candidates.mjs';

const packages = [
  {
    directory: 'packages/base',
    packageJson: { name: '@workbench-kit/base', version: '1.2.3' },
  },
  {
    directory: 'packages/platform',
    packageJson: { name: '@workbench-kit/platform', version: '1.2.3' },
  },
];

describe('preparePublishCandidates', () => {
  it('does not prepare artifacts when every exact version is already published', () => {
    const onPrepare = vi.fn();
    const onSkip = vi.fn();

    const candidates = preparePublishCandidates({
      isPackagePublished: vi.fn(),
      isVersionPublished: () => true,
      onPrepare,
      onSkip,
      packages,
      publishNewPackages: true,
    });

    expect(candidates).toEqual([]);
    expect(onPrepare).not.toHaveBeenCalled();
    expect(onSkip).toHaveBeenCalledTimes(2);
    expect(onSkip).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'version-published',
        spec: '@workbench-kit/base@1.2.3',
      }),
    );
  });

  it('prepares artifacts once before returning publishable candidates', () => {
    const onPrepare = vi.fn();

    const candidates = preparePublishCandidates({
      isPackagePublished: () => true,
      isVersionPublished: (spec: string) => spec.includes('/base@'),
      onPrepare,
      onSkip: vi.fn(),
      packages,
      publishNewPackages: false,
    });

    expect(candidates).toEqual([packages[1]]);
    expect(onPrepare).toHaveBeenCalledTimes(1);
  });

  it('skips first releases in updates-only mode without preparing artifacts', () => {
    const onPrepare = vi.fn();
    const onSkip = vi.fn();

    const candidates = preparePublishCandidates({
      isPackagePublished: () => false,
      isVersionPublished: () => false,
      onPrepare,
      onSkip,
      packages,
      publishNewPackages: false,
    });

    expect(candidates).toEqual([]);
    expect(onPrepare).not.toHaveBeenCalled();
    expect(onSkip).toHaveBeenCalledWith(expect.objectContaining({ reason: 'package-missing' }));
  });

  it('keeps local --all mode publishable without registry lookups', () => {
    const isPackagePublished = vi.fn();
    const isVersionPublished = vi.fn();
    const onPrepare = vi.fn();

    const candidates = preparePublishCandidates({
      isPackagePublished,
      isVersionPublished,
      onPrepare,
      onSkip: vi.fn(),
      packages,
      publishNewPackages: true,
      skipPublishedVersions: false,
    });

    expect(candidates).toEqual(packages);
    expect(isVersionPublished).not.toHaveBeenCalled();
    expect(isPackagePublished).not.toHaveBeenCalled();
    expect(onPrepare).toHaveBeenCalledTimes(1);
  });
});
