import { describe, expect, it } from 'vitest';

import {
  formatWorkspaceResourceUri,
  parseWorkspaceResourceUri,
  workspacePathFromResourceUri,
  workspaceResourceUriForFile,
  workspaceResourceUriForFolder,
} from './uri.js';

describe('workspace resource URI identity', () => {
  it('preserves ordinary ASCII file and folder URIs and the root folder', () => {
    expect(formatWorkspaceResourceUri({ kind: 'file', path: 'src/App.test-1_2.tsx' })).toBe(
      'workspace://file/src/App.test-1_2.tsx',
    );
    expect(parseWorkspaceResourceUri('workspace://file/src/App.test-1_2.tsx')).toEqual({
      scheme: 'workspace',
      kind: 'file',
      path: 'src/App.test-1_2.tsx',
    });
    expect(workspaceResourceUriForFolder('src/components')).toBe(
      'workspace://folder/src/components',
    );
    expect(parseWorkspaceResourceUri('workspace://folder/')).toEqual({
      scheme: 'workspace',
      kind: 'folder',
      path: '',
    });
  });

  it('encodes multilingual segments and resolves canonical and raw Unicode paths', () => {
    const uri = 'workspace://file/src/%ED%95%9C%EA%B8%80-%E6%97%A5%E6%9C%AC.tsx';
    expect(workspaceResourceUriForFile({ path: 'src/한글-日本.tsx', content: 'original' })).toBe(
      uri,
    );
    expect(parseWorkspaceResourceUri(uri)).toEqual({
      scheme: 'workspace',
      kind: 'file',
      path: 'src/한글-日本.tsx',
    });
    expect(workspacePathFromResourceUri('workspace://file/src/한글-日本.tsx')).toBe(
      'src/한글-日本.tsx',
    );
    expect(workspaceResourceUriForFolder('한글/日本')).toBe(
      'workspace://folder/%ED%95%9C%EA%B8%80/%E6%97%A5%E6%9C%AC',
    );
    expect(
      parseWorkspaceResourceUri('workspace://folder/%ED%95%9C%EA%B8%80/%E6%97%A5%E6%9C%AC')?.path,
    ).toBe('한글/日本');
  });

  it('preserves spaces in canonical and raw paths without treating plus as space', () => {
    expect(formatWorkspaceResourceUri({ kind: 'file', path: 'my folder/a + b.txt' })).toBe(
      'workspace://file/my%20folder/a%20%2B%20b.txt',
    );
    expect(workspacePathFromResourceUri('workspace://file/my%20folder/a%20%2B%20b.txt')).toBe(
      'my folder/a + b.txt',
    );
    expect(workspacePathFromResourceUri('workspace://file/my folder/a + b.txt')).toBe(
      'my folder/a + b.txt',
    );
  });

  it('keeps literal percent sequences distinct from decoded names and structural separators', () => {
    expect(formatWorkspaceResourceUri({ kind: 'file', path: 'src/%41-%2F-%5C-100%.txt' })).toBe(
      'workspace://file/src/%2541-%252F-%255C-100%25.txt',
    );
    expect(workspacePathFromResourceUri('workspace://file/src/%2541-%252F-%255C-100%25.txt')).toBe(
      'src/%41-%2F-%5C-100%.txt',
    );
    expect(workspacePathFromResourceUri('workspace://file/src/%41.txt')).toBe('src/A.txt');
    expect(workspacePathFromResourceUri('workspace://file/src/%2541.txt')).toBe('src/%41.txt');
    expect(workspacePathFromResourceUri('workspace://file/src/%252E%252E.txt')).toBe(
      'src/%2E%2E.txt',
    );
  });

  it('round-trips query fragment and reserved filename characters as path data', () => {
    const path = 'src/a?#:@&=+.txt';
    const uri = formatWorkspaceResourceUri({ kind: 'file', path });
    expect(uri).toBe('workspace://file/src/a%3F%23%3A%40%26%3D%2B.txt');
    expect(new URL(uri).search).toBe('');
    expect(new URL(uri).hash).toBe('');
    expect(workspacePathFromResourceUri(uri)).toBe(path);
  });

  it('rejects malformed escapes and invalid UTF-8 instead of returning an aliased path', () => {
    for (const segment of ['bad%', 'bad%2', 'bad%GG', '%C3%28', '%ED%A0%80']) {
      expect(parseWorkspaceResourceUri(`workspace://file/src/${segment}.txt`)).toBeNull();
    }
  });

  it('rejects encoded forward and backward separators without rewriting path structure', () => {
    for (const segment of ['a%2Fb', 'a%2fb', 'a%5Cb', 'a%5cb']) {
      expect(parseWorkspaceResourceUri(`workspace://file/src/${segment}.txt`)).toBeNull();
      expect(parseWorkspaceResourceUri(`workspace://folder/src/${segment}`)).toBeNull();
    }
  });

  it('retains normalization and rejection of unsupported schemes kinds and empty files', () => {
    expect(formatWorkspaceResourceUri({ kind: 'file', path: '/src//App.tsx' })).toBe(
      'workspace://file/src/App.tsx',
    );
    expect(formatWorkspaceResourceUri({ kind: 'file', path: 'src\\App.tsx' })).toBe(
      'workspace://file/src/App.tsx',
    );
    expect(workspacePathFromResourceUri('workspace://file/src\\App.tsx')).toBe('src/App.tsx');
    expect(() => formatWorkspaceResourceUri({ kind: 'file', path: 'src/../App.tsx' })).toThrow();
    expect(parseWorkspaceResourceUri('file://file/src/App.tsx')).toBeNull();
    expect(parseWorkspaceResourceUri('workspace://other/src/App.tsx')).toBeNull();
    expect(parseWorkspaceResourceUri('workspace://file/')).toBeNull();
    expect(parseWorkspaceResourceUri('not a uri')).toBeNull();
  });
});
