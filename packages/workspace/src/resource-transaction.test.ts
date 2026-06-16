import { describe, expect, it } from 'vitest';

import {
  formatWorkspaceResourceUri,
  parseWorkspaceResourceUri,
  workspaceResourceUriForFile,
} from './resource-uri.js';
import {
  createWorkspaceResourceSnapshot,
  snapshotMatchesWorkspaceState,
} from './resource-snapshot.js';
import {
  virtualWorkspaceActionToResourceMutation,
  workspaceResourceMutationToAction,
} from './resource-mutation.js';
import {
  applyWorkspaceResourceTransaction,
  createWorkspaceResourceTransaction,
} from './resource-transaction.js';
import {
  initializeVirtualWorkspaceState,
  virtualWorkspaceReducer,
  type VirtualWorkspaceAction,
} from './virtualWorkspace.js';

function reduceWorkspace(actions: VirtualWorkspaceAction[]) {
  return actions.reduce(
    (state, action) => virtualWorkspaceReducer(state, action),
    initializeVirtualWorkspaceState({ files: [{ content: 'readme', path: 'README.md' }] }),
  );
}

describe('workspace resource URI', () => {
  it('formats and parses file and folder URIs', () => {
    expect(formatWorkspaceResourceUri({ path: 'src/App.tsx', kind: 'file' })).toBe(
      'workspace://file/src/App.tsx',
    );
    expect(parseWorkspaceResourceUri('workspace://folder/src/components')).toEqual({
      scheme: 'workspace',
      path: 'src/components',
      kind: 'folder',
    });
    expect(workspaceResourceUriForFile({ content: 'x', path: 'src/App.tsx' })).toBe(
      'workspace://file/src/App.tsx',
    );
  });
});

describe('workspace resource snapshot', () => {
  it('captures files and folders without UI state', () => {
    const state = initializeVirtualWorkspaceState({
      files: [{ content: 'app', path: 'src/App.tsx' }],
      folders: ['src'],
      openPaths: ['src/App.tsx'],
      selectedPath: 'src/App.tsx',
    });

    const snapshot = createWorkspaceResourceSnapshot(state, 2);

    expect(snapshot.version).toBe(2);
    expect(snapshot.files).toEqual([{ content: 'app', path: 'src/App.tsx' }]);
    expect(snapshot.folders).toEqual(['src']);
    expect(snapshotMatchesWorkspaceState(snapshot, state)).toBe(true);
  });
});

describe('workspace resource transaction', () => {
  it('maps resource mutations to reducer actions', () => {
    expect(
      workspaceResourceMutationToAction({
        type: 'create-file',
        path: 'src/Button.tsx',
        file: { path: 'src/Button.tsx', content: 'button' },
      }),
    ).toEqual({
      type: 'create-file',
      file: { path: 'src/Button.tsx', content: 'button' },
    });

    expect(
      virtualWorkspaceActionToResourceMutation({ type: 'open-file', path: 'src/App.tsx' }),
    ).toBe(null);

    expect(
      workspaceResourceMutationToAction({
        type: 'initialize-workspace',
        state: {
          files: [{ content: 'app', path: 'src/App.tsx' }],
          folders: ['src'],
        },
      }),
    ).toEqual({
      type: 'initialize-workspace',
      state: {
        files: [{ content: 'app', path: 'src/App.tsx' }],
        folders: ['src'],
      },
    });
  });

  it('applies transactions through the virtual workspace reducer', () => {
    const transaction = createWorkspaceResourceTransaction({
      label: 'Add component',
      mutations: [
        { type: 'create-folder', path: 'src' },
        {
          type: 'create-file',
          path: 'src/Button.tsx',
          file: { path: 'src/Button.tsx', content: 'button' },
        },
      ],
    });

    const initialState = initializeVirtualWorkspaceState({
      files: [{ content: 'readme', path: 'README.md' }],
    });
    const transactionState = applyWorkspaceResourceTransaction(initialState, transaction);
    const actionState = reduceWorkspace([
      { type: 'create-folder', path: 'src' },
      { file: { content: 'button', path: 'src/Button.tsx' }, type: 'create-file' },
    ]);

    expect(transactionState.files.map((file) => file.path).sort()).toEqual(
      actionState.files.map((file) => file.path).sort(),
    );
    expect(transactionState.folders).toEqual(actionState.folders);
    expect(transactionState.openPaths).toEqual(actionState.openPaths);
    expect(transactionState.selectedPath).toBe(actionState.selectedPath);
  });

  it('applies initialize workspace transactions without opening seeded files', () => {
    const initialState = initializeVirtualWorkspaceState({
      files: [{ content: 'stale', path: 'stale.txt' }],
      openPaths: ['stale.txt'],
      selectedPath: 'stale.txt',
    });
    const transaction = createWorkspaceResourceTransaction({
      label: 'Initialize workspace',
      mutations: [
        {
          type: 'initialize-workspace',
          state: {
            expandedPaths: ['src'],
            files: [{ content: 'app', path: 'src/App.tsx' }],
            folders: ['src'],
          },
        },
      ],
    });

    const transactionState = applyWorkspaceResourceTransaction(initialState, transaction);

    expect(transactionState.files).toEqual([{ content: 'app', path: 'src/App.tsx' }]);
    expect(transactionState.folders).toEqual(['src']);
    expect([...transactionState.expandedPaths]).toEqual(['src']);
    expect(transactionState.openPaths).toEqual([]);
    expect(transactionState.selectedPath).toBeUndefined();
  });
});
