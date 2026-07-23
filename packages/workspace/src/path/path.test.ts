import { describe, expect, it } from 'vitest';
import {
  WorkspacePathError,
  extensionOfPath,
  fileNameOfPath,
  formatWorkspacePathDisplay,
  isSimpleWorkspaceName,
  joinWorkspacePath,
  normalizeWorkspacePath,
  parentPathOf,
  parentPathsOf,
  tryNormalizeWorkspacePath,
  workspacePathSegments,
} from './path';

describe('workspace path helpers', () => {
  it('normalizes workspace paths to slash-separated relative paths', () => {
    expect(normalizeWorkspacePath('\\src\\\\components/Button.tsx/')).toBe(
      'src/components/Button.tsx',
    );
    expect(workspacePathSegments('/src//components/Button.tsx')).toEqual([
      'src',
      'components',
      'Button.tsx',
    ]);
  });

  it('rejects traversal, drive letters, and UNC forms', () => {
    expect(() => normalizeWorkspacePath('a/../b')).toThrow(WorkspacePathError);
    expect(() => normalizeWorkspacePath('../secret')).toThrow(WorkspacePathError);
    expect(() => normalizeWorkspacePath('src/./Button.tsx')).toThrow(WorkspacePathError);
    expect(() => normalizeWorkspacePath('C:/Windows/System32')).toThrow(WorkspacePathError);
    expect(() => normalizeWorkspacePath('D:\\data\\file.txt')).toThrow(WorkspacePathError);
    expect(() => normalizeWorkspacePath('//server/share/file')).toThrow(WorkspacePathError);
    expect(tryNormalizeWorkspacePath('../escape')).toBeUndefined();
    expect(tryNormalizeWorkspacePath('src/ok.ts')).toBe('src/ok.ts');
    expect(tryNormalizeWorkspacePath('/src/ok.ts')).toBe('src/ok.ts');
  });

  it('derives path parts without leaking root separators', () => {
    expect(joinWorkspacePath('src/components', 'Button.tsx')).toBe('src/components/Button.tsx');
    expect(fileNameOfPath('src/components/Button.tsx')).toBe('Button.tsx');
    expect(parentPathOf('src/components/Button.tsx')).toBe('src/components');
    expect(parentPathsOf('src/components/Button.tsx')).toEqual(['src', 'src/components']);
    expect(extensionOfPath('src/components/Button.TSX')).toBe('tsx');
  });

  it('formats workspace paths for breadcrumb-style display', () => {
    expect(formatWorkspacePathDisplay('src/components/Button.tsx')).toBe(
      'src > components > Button.tsx',
    );
    expect(formatWorkspacePathDisplay('README.md')).toBe('README.md');
    expect(formatWorkspacePathDisplay('\\packages\\react\\src')).toBe('packages > react > src');
  });

  it('accepts only simple workspace names', () => {
    expect(isSimpleWorkspaceName('Button.tsx')).toBe(true);
    expect(isSimpleWorkspaceName('nested/Button.tsx')).toBe(false);
    expect(isSimpleWorkspaceName('..')).toBe(false);
    expect(isSimpleWorkspaceName('   ')).toBe(false);
  });
});
