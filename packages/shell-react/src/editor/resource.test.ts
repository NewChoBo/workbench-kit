import { describe, expect, it } from 'vitest';

import { normalizeWorkspaceResourceUri, pathForResource } from './resource.js';

describe('editor-resource', () => {
  it('uses workspace parser helpers for workspace file paths', () => {
    expect(pathForResource('workspace://file/src/App.tsx')).toBe('src/App.tsx');
  });

  it('keeps folder and non-workspace resources unchanged', () => {
    expect(pathForResource('workspace://folder/src')).toBe('workspace://folder/src');
    expect(pathForResource('sample-source:/documents/main.json')).toBe(
      'sample-source:/documents/main.json',
    );
  });

  it('canonicalizes workspace URI aliases while preserving literal percent data', () => {
    expect(normalizeWorkspaceResourceUri('workspace://file/src/%41.txt')).toBe(
      'workspace://file/src/A.txt',
    );
    expect(normalizeWorkspaceResourceUri('workspace://file/src/%2541.txt')).toBe(
      'workspace://file/src/%2541.txt',
    );
    expect(normalizeWorkspaceResourceUri('workspace://file/src/한글-日本語.txt')).toBe(
      'workspace://file/src/%ED%95%9C%EA%B8%80-%E6%97%A5%E6%9C%AC%E8%AA%9E.txt',
    );
  });

  it('leaves opaque and malformed identifiers unchanged', () => {
    expect(normalizeWorkspaceResourceUri('custom://document/%41.txt')).toBe(
      'custom://document/%41.txt',
    );
    expect(normalizeWorkspaceResourceUri('workspace://file/src/%GG.txt')).toBe(
      'workspace://file/src/%GG.txt',
    );
  });
});
