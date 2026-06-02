import { describe, expect, it } from 'vitest';
import {
  extensionOfPath,
  fileNameOfPath,
  isSimpleWorkspaceName,
  joinWorkspacePath,
  normalizeWorkspacePath,
  parentPathOf,
  parentPathsOf,
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

  it('derives path parts without leaking root separators', () => {
    expect(joinWorkspacePath('src/components', 'Button.tsx')).toBe('src/components/Button.tsx');
    expect(fileNameOfPath('src/components/Button.tsx')).toBe('Button.tsx');
    expect(parentPathOf('src/components/Button.tsx')).toBe('src/components');
    expect(parentPathsOf('src/components/Button.tsx')).toEqual(['src', 'src/components']);
    expect(extensionOfPath('src/components/Button.TSX')).toBe('tsx');
  });

  it('accepts only simple workspace names', () => {
    expect(isSimpleWorkspaceName('Button.tsx')).toBe(true);
    expect(isSimpleWorkspaceName('nested/Button.tsx')).toBe(false);
    expect(isSimpleWorkspaceName('..')).toBe(false);
    expect(isSimpleWorkspaceName('   ')).toBe(false);
  });
});
