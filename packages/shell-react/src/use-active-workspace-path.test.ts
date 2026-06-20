import { describe, expect, it } from 'vitest';

import { resolveActiveWorkspacePath } from './use-active-workspace-path.js';

describe('resolveActiveWorkspacePath', () => {
  it('returns file paths from workspace file URIs', () => {
    expect(resolveActiveWorkspacePath('workspace://file/src/App.tsx')).toBe('src/App.tsx');
  });

  it('ignores folders, unsupported schemes, and missing resource URIs', () => {
    expect(resolveActiveWorkspacePath('workspace://folder/src')).toBeUndefined();
    expect(resolveActiveWorkspacePath('file:///src/App.tsx')).toBeUndefined();
    expect(resolveActiveWorkspacePath(undefined)).toBeUndefined();
  });
});
