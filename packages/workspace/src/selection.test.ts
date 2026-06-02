import { describe, expect, it } from 'vitest';
import {
  getWorkspaceSelectionRange,
  getWorkspaceSelectionActionPaths,
  normalizeWorkspaceSelectionPaths,
  pruneWorkspaceSelection,
  updateWorkspaceSelection,
} from './selection';

const orderedPaths = ['README.md', 'src/App.tsx', 'src/Button.tsx', 'src/Card.tsx'];

describe('workspace selection helpers', () => {
  it('normalizes and de-duplicates selected paths', () => {
    expect(
      normalizeWorkspaceSelectionPaths(['/src//App.tsx', 'src\\App.tsx', '', 'src/Button.tsx']),
    ).toEqual(['src/App.tsx', 'src/Button.tsx']);
  });

  it('selects a single target and sets the anchor', () => {
    expect(
      updateWorkspaceSelection({
        mode: 'single',
        orderedPaths,
        selection: { paths: ['README.md'] },
        targetPath: 'src/App.tsx',
      }),
    ).toEqual({
      anchorPath: 'src/App.tsx',
      paths: ['src/App.tsx'],
    });
  });

  it('toggles targets while preserving stable order', () => {
    const selected = updateWorkspaceSelection({
      mode: 'toggle',
      orderedPaths,
      selection: { anchorPath: 'README.md', paths: ['README.md'] },
      targetPath: 'src/Button.tsx',
    });

    expect(selected).toEqual({
      anchorPath: 'src/Button.tsx',
      paths: ['README.md', 'src/Button.tsx'],
    });

    expect(
      updateWorkspaceSelection({
        mode: 'toggle',
        orderedPaths,
        selection: selected,
        targetPath: 'src/Button.tsx',
      }),
    ).toEqual({
      anchorPath: 'README.md',
      paths: ['README.md'],
    });
  });

  it('returns the visible range between anchor and target', () => {
    expect(
      getWorkspaceSelectionRange({
        anchorPath: 'src/App.tsx',
        orderedPaths,
        targetPath: 'src/Card.tsx',
      }),
    ).toEqual(['src/App.tsx', 'src/Button.tsx', 'src/Card.tsx']);
  });

  it('keeps selected action paths when the target is already selected', () => {
    expect(
      getWorkspaceSelectionActionPaths({
        selectedPaths: ['src\\App.tsx', 'src/Button.tsx'],
        targetPath: '/src//Button.tsx',
      }),
    ).toEqual(['src/App.tsx', 'src/Button.tsx']);
  });

  it('uses the target as the action path when it is outside the current selection', () => {
    expect(
      getWorkspaceSelectionActionPaths({
        selectedPaths: ['README.md', 'src/App.tsx'],
        targetPath: 'src/Card.tsx',
      }),
    ).toEqual(['src/Card.tsx']);
  });

  it('replaces selection with a range from the current anchor', () => {
    expect(
      updateWorkspaceSelection({
        mode: 'range',
        orderedPaths,
        selection: { anchorPath: 'src/App.tsx', paths: ['src/App.tsx'] },
        targetPath: 'src/Card.tsx',
      }),
    ).toEqual({
      anchorPath: 'src/App.tsx',
      paths: ['src/App.tsx', 'src/Button.tsx', 'src/Card.tsx'],
    });
  });

  it('adds a range to the current selection for toggle-range mode', () => {
    expect(
      updateWorkspaceSelection({
        mode: 'toggle-range',
        orderedPaths,
        selection: { anchorPath: 'src/App.tsx', paths: ['README.md', 'src/App.tsx'] },
        targetPath: 'src/Card.tsx',
      }),
    ).toEqual({
      anchorPath: 'src/App.tsx',
      paths: ['README.md', 'src/App.tsx', 'src/Button.tsx', 'src/Card.tsx'],
    });
  });

  it('prunes deleted paths and recovers the anchor', () => {
    expect(
      pruneWorkspaceSelection(
        {
          anchorPath: 'src/Card.tsx',
          paths: ['README.md', 'src/Card.tsx', 'missing.ts'],
        },
        ['README.md', 'src/App.tsx'],
      ),
    ).toEqual({
      anchorPath: 'README.md',
      paths: ['README.md'],
    });
  });
});
