import { describe, expect, it } from 'vitest';
import {
  initializeVirtualWorkspaceState,
  virtualWorkspaceReducer,
  type VirtualWorkspaceAction,
  type VirtualWorkspaceInitialState,
} from './virtualWorkspace';

function reduceWorkspace(
  initialState: VirtualWorkspaceInitialState,
  actions: VirtualWorkspaceAction[],
) {
  return actions.reduce(
    (state, action) => virtualWorkspaceReducer(state, action),
    initializeVirtualWorkspaceState(initialState),
  );
}

describe('virtual workspace model', () => {
  it('normalizes initial files, folders, selection, and open paths', () => {
    const state = initializeVirtualWorkspaceState({
      expandedPaths: ['src', 'missing'],
      files: [
        { content: 'first', path: '/src//App.tsx' },
        { content: 'duplicate wins', path: 'src/App.tsx' },
      ],
      folders: ['src/components'],
      openPaths: ['src/App.tsx', 'missing.ts'],
      selectedPath: 'missing.ts',
    });

    expect(state.files).toEqual([{ content: 'duplicate wins', path: 'src/App.tsx' }]);
    expect(state.folders).toEqual(['src/components']);
    expect([...state.expandedPaths]).toEqual(['src']);
    expect(state.openPaths).toEqual(['src/App.tsx']);
    expect(state.selectedPath).toBe('src/App.tsx');
  });

  it('creates files and folders while preventing path conflicts', () => {
    const state = reduceWorkspace({ files: [{ content: 'readme', path: 'README.md' }] }, [
      { path: 'src', type: 'create-folder' },
      { file: { content: 'button', path: 'src/Button.tsx' }, type: 'create-file' },
      { file: { content: 'blocked', path: 'src/Button.tsx' }, type: 'create-file' },
    ]);

    expect(state.folders).toEqual(['src']);
    expect(state.files.map((file) => file.path).sort()).toEqual(['README.md', 'src/Button.tsx']);
    expect(state.openPaths).toEqual(['src/Button.tsx']);
    expect(state.selectedPath).toBe('src/Button.tsx');
    expect(state.expandedPaths.has('src')).toBe(true);
  });

  it('renames folders and updates descendants, open tabs, selection, and expansion', () => {
    const state = reduceWorkspace(
      {
        expandedPaths: ['src', 'src/components'],
        files: [{ content: 'button', path: 'src/components/Button.tsx' }],
        folders: ['src/components'],
        openPaths: ['src/components/Button.tsx'],
        selectedPath: 'src/components/Button.tsx',
      },
      [{ name: 'ui', path: 'src/components', type: 'rename-folder' }],
    );

    expect(state.files[0]?.path).toBe('src/ui/Button.tsx');
    expect(state.folders).toEqual(['src/ui']);
    expect(state.openPaths).toEqual(['src/ui/Button.tsx']);
    expect(state.selectedPath).toBe('src/ui/Button.tsx');
    expect([...state.expandedPaths].sort()).toEqual(['src', 'src/ui']);
  });

  it('moves files to folders and keeps tabs aligned', () => {
    const state = reduceWorkspace(
      {
        files: [{ content: 'notes', path: 'notes.md' }],
        folders: ['docs'],
        openPaths: ['notes.md'],
        selectedPath: 'notes.md',
      },
      [{ sourcePath: 'notes.md', targetFolderPath: 'docs', type: 'move-file' }],
    );

    expect(state.files[0]?.path).toBe('docs/notes.md');
    expect(state.openPaths).toEqual(['docs/notes.md']);
    expect(state.selectedPath).toBe('docs/notes.md');
  });

  it('deletes folders recursively and recovers selection to a remaining open file', () => {
    const state = reduceWorkspace(
      {
        files: [
          { content: 'app', path: 'src/App.tsx' },
          { content: 'readme', path: 'README.md' },
        ],
        folders: ['src'],
        openPaths: ['src/App.tsx', 'README.md'],
        selectedPath: 'src/App.tsx',
      },
      [{ path: 'src', type: 'delete-folder' }],
    );

    expect(state.files.map((file) => file.path)).toEqual(['README.md']);
    expect(state.folders).toEqual([]);
    expect(state.openPaths).toEqual(['README.md']);
    expect(state.selectedPath).toBe('README.md');
  });
});
