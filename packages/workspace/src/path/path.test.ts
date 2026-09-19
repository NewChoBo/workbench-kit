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

  it('rejects unpaired UTF-16 surrogates while preserving valid Unicode', () => {
    const highSurrogate = String.fromCharCode(0xd800);
    const lowSurrogate = String.fromCharCode(0xdc00);
    const invalidPaths = [
      `${highSurrogate}start.ts`,
      `middle${highSurrogate}.ts`,
      `end.ts${highSurrogate}`,
      `${lowSurrogate}start.ts`,
      `middle${lowSurrogate}.ts`,
      `end.ts${lowSurrogate}`,
    ];

    for (const path of invalidPaths) {
      expect(() => normalizeWorkspacePath(path)).toThrow(WorkspacePathError);
      expect(tryNormalizeWorkspacePath(path)).toBeUndefined();
    }

    expect(normalizeWorkspacePath('src/emoji-😀.ts')).toBe('src/emoji-😀.ts');
    expect(normalizeWorkspacePath('src/한글-日本語 %.ts')).toBe('src/한글-日本語 %.ts');
    expect(isSimpleWorkspaceName('emoji-😀.ts')).toBe(true);
    expect(isSimpleWorkspaceName(`bad${highSurrogate}.ts`)).toBe(false);
    expect(isSimpleWorkspaceName(`bad${lowSurrogate}.ts`)).toBe(false);
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
