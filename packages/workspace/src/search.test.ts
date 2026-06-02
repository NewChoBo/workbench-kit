import { describe, expect, it } from 'vitest';
import { createContentPreview, highlightText, searchWorkspaceFiles } from './search';
import type { WorkspaceFile } from './types';

const files: WorkspaceFile[] = [
  {
    content: 'Intro content\nexport function Button() {}',
    path: 'src/Button.tsx',
  },
  {
    content: 'Search panel renders workspace results.',
    path: 'src/SearchPanel.tsx',
  },
];

describe('workspace search helpers', () => {
  it('sorts path matches before content matches', () => {
    expect(searchWorkspaceFiles(files, 'search').map((result) => result.path)).toEqual([
      'src/SearchPanel.tsx',
    ]);
    expect(searchWorkspaceFiles(files, 'button').map((result) => result.matchedBy)).toEqual([
      'Path match',
    ]);
  });

  it('reports content line numbers and compact previews', () => {
    const [result] = searchWorkspaceFiles(files, 'export');

    expect(result?.path).toBe('src/Button.tsx');
    expect(result?.matchedBy).toBe('Content match');
    expect(result?.line).toBe(2);
    expect(result?.preview).toContain('export function');
  });

  it('highlights repeated matches case-insensitively', () => {
    expect(highlightText('Button button', 'button')).toEqual([
      { match: true, text: 'Button' },
      { match: false, text: ' ' },
      { match: true, text: 'button' },
    ]);
  });

  it('creates a trimmed preview around the first content match', () => {
    const preview = createContentPreview(
      `${'before '.repeat(20)}target ${'after '.repeat(20)}`,
      'target',
    );

    expect(preview).toContain('target');
    expect(preview.length).toBeLessThan(140);
  });
});
