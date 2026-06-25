import { describe, expect, it } from 'vitest';

import {
  isWorkspaceFileResourceUri,
  labelForWorkspaceFileResource,
  pathForWorkspaceFileResource,
} from './resource-uri.js';

describe('builtin.editor resource URI helpers', () => {
  it('resolves workspace file URIs through the workspace parser', () => {
    expect(isWorkspaceFileResourceUri('workspace://file/src/App.tsx')).toBe(true);
    expect(pathForWorkspaceFileResource('workspace://file/src/App.tsx')).toBe('src/App.tsx');
    expect(labelForWorkspaceFileResource('workspace://file/src/App.tsx')).toBe('App.tsx');
  });

  it('rejects workspace folders and non-workspace URIs', () => {
    expect(isWorkspaceFileResourceUri('workspace://folder/src')).toBe(false);
    expect(pathForWorkspaceFileResource('workspace://folder/src')).toBeUndefined();
    expect(pathForWorkspaceFileResource('tilepaper-source:/launchpads/main.json')).toBeUndefined();
  });
});
