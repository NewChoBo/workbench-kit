import { describe, expect, it } from 'vitest';

import { createWorkspaceFileAvailabilityChecker } from './editor-workspace-reconcile.js';

describe('createWorkspaceFileAvailabilityChecker', () => {
  it('returns true for non-workspace resources', () => {
    const isAvailable = createWorkspaceFileAvailabilityChecker(new Set());

    expect(isAvailable('custom://resource')).toBe(true);
  });

  it('checks workspace file paths against the provided set', () => {
    const isAvailable = createWorkspaceFileAvailabilityChecker(
      new Set(['src/App.tsx', 'README.md']),
    );

    expect(isAvailable('workspace://file/src/App.tsx')).toBe(true);
    expect(isAvailable('workspace://file/example.jdw.json')).toBe(false);
    expect(isAvailable('workspace://folder/src')).toBe(true);
  });
});
