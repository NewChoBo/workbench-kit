import { describe, expect, it } from 'vitest';

import { pathForResource } from './resource.js';

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
});
