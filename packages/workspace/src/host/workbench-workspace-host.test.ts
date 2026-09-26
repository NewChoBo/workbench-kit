import { describe, expect, it } from 'vitest';

import { createWorkspaceResourceTransaction } from '../resource/transaction.js';
import { formatWorkspaceResourceUri } from '../resource/uri.js';
import {
  WorkspaceResourceService,
  createWorkbenchWorkspaceHostPort,
} from './workbench-workspace-host.js';

describe('workbench workspace host port', () => {
  it('applies save transactions and records journal entries', () => {
    const port = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [{ content: 'original', path: 'src/App.tsx' }],
        folders: ['src'],
      },
    });

    const result = port.applySave('workspace://file/src/App.tsx', 'updated');

    expect(result?.transactionId).toEqual(expect.any(String));
    expect(port.service.getFile('src/App.tsx')?.content).toBe('updated');
    expect(port.service.getTransactionJournal()).toHaveLength(1);
    expect(port.service.getSnapshot().version).toBe(2);
  });

  it('creates files that do not yet exist in the workspace', () => {
    const port = createWorkbenchWorkspaceHostPort();

    port.applySave('workspace://file/src/New.tsx', 'new file body');

    expect(port.service.getFile('src/New.tsx')?.content).toBe('new file body');
  });

  it('reports save eligibility from the current workspace state', () => {
    const port = createWorkbenchWorkspaceHostPort({
      initialState: { files: [{ content: 'existing', path: 'src/App.tsx' }] },
    });

    expect(port.canSaveResource?.('workspace://file/src/App.tsx')).toBe(true);
    expect(port.canSaveResource?.('workspace://file/src/Missing.tsx')).toBe(false);
    expect(port.applySave('workspace://file/src/Missing.tsx', 'created')?.transactionId).toEqual(
      expect.any(String),
    );
    expect(port.canSaveResource?.('workspace://file/src/Missing.tsx')).toBe(true);
  });

  it('resolves workspace file resources for editor hosts', () => {
    const service = new WorkspaceResourceService({
      initialState: {
        files: [{ content: 'readme', path: 'README.md' }],
      },
    });

    expect(service.getFileByResourceUri('workspace://file/README.md')).toEqual({
      content: 'readme',
      path: 'README.md',
    });
  });

  it('resolves and saves the renamed multilingual file without changing another file', () => {
    const renamedPath = 'src/App-with-a-long-context-menu-regression-name-다국어-日本語.tsx';
    const port = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [
          { content: 'export const app = "original";', path: 'src/App.tsx' },
          { content: 'export const sibling = "unchanged";', path: 'src/Other.tsx' },
        ],
        folders: ['src'],
      },
    });
    port.service.applyTransaction(
      createWorkspaceResourceTransaction({
        label: 'Rename fixture',
        mutations: [
          {
            type: 'rename-file',
            path: 'src/App.tsx',
            name: 'App-with-a-long-context-menu-regression-name-다국어-日本語.tsx',
          },
        ],
      }),
    );
    const uri = formatWorkspaceResourceUri({ kind: 'file', path: renamedPath });

    expect(port.resolveResource?.(uri)).toMatchObject({
      path: renamedPath,
      content: 'export const app = "original";',
    });
    expect(port.service.getFile('src/App.tsx')).toBeUndefined();
    expect(port.applySave(uri, 'export const app = "updated";')?.transactionId).toEqual(
      expect.any(String),
    );
    expect(port.service.getState().files.map(({ path, content }) => ({ path, content }))).toEqual([
      { content: 'export const sibling = "unchanged";', path: 'src/Other.tsx' },
      { content: 'export const app = "updated";', path: renamedPath },
    ]);
    expect(port.service.getFile('src/Other.tsx')).toEqual({
      content: 'export const sibling = "unchanged";',
      path: 'src/Other.tsx',
    });
    expect(port.service.getTransactionJournal()).toHaveLength(2);
    expect(port.service.getTransactionJournal()[1]?.mutations).toEqual([
      { type: 'save-file', path: renamedPath, file: { content: 'export const app = "updated";' } },
    ]);
    port.dispose?.();
  });

  it('keeps reserved and literal percent filenames separate during lookup and save', () => {
    const port = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [
          { path: 'src/a?#%2F.txt', content: 'reserved' },
          { path: 'src/a', content: 'neighbor' },
          { path: 'src/%41.txt', content: 'literal percent' },
          { path: 'src/A.txt', content: 'decoded neighbor' },
        ],
      },
    });
    const reservedUri = formatWorkspaceResourceUri({ kind: 'file', path: 'src/a?#%2F.txt' });
    const percentUri = formatWorkspaceResourceUri({ kind: 'file', path: 'src/%41.txt' });
    expect(port.resolveResource?.(reservedUri)).toEqual({
      path: 'src/a?#%2F.txt',
      content: 'reserved',
    });
    expect(port.resolveResource?.(percentUri)).toEqual({
      path: 'src/%41.txt',
      content: 'literal percent',
    });
    port.applySave(reservedUri, 'changed reserved');
    port.applySave(percentUri, 'changed percent');
    expect(port.service.getState().files.map(({ path, content }) => ({ path, content }))).toEqual([
      { path: 'src/a?#%2F.txt', content: 'changed reserved' },
      { path: 'src/a', content: 'neighbor' },
      { path: 'src/%41.txt', content: 'changed percent' },
      { path: 'src/A.txt', content: 'decoded neighbor' },
    ]);
    expect(port.service.getFile('src/a')).toEqual({ path: 'src/a', content: 'neighbor' });
    expect(port.service.getFile('src/A.txt')).toEqual({
      path: 'src/A.txt',
      content: 'decoded neighbor',
    });
    port.dispose?.();
  });

  it('does not resolve create or save resources with invalid encoded paths', () => {
    const port = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [{ path: 'src/a/b.txt', content: 'untouched' }],
      },
    });
    const before = port.service.getState();
    for (const uri of ['workspace://file/src/a%2Fb.txt', 'workspace://file/src/bad%.txt']) {
      expect(port.resolveResource?.(uri)).toBeUndefined();
      expect(port.applySave(uri, 'must not be written')).toBeUndefined();
    }
    expect(port.service.getState()).toEqual(before);
    expect(port.service.getTransactionJournal()).toHaveLength(0);
    port.dispose?.();
  });

  it('leaves state, snapshot version, and journal unchanged for an invalid rename', () => {
    const highSurrogate = String.fromCharCode(0xd800);
    const port = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [{ path: 'src/App.tsx', content: 'original' }],
        folders: ['src'],
        openPaths: ['src/App.tsx'],
        selectedPath: 'src/App.tsx',
      },
    });
    const beforeState = port.service.getState();
    const beforeSnapshot = port.service.getSnapshot();

    port.service.applyTransaction(
      createWorkspaceResourceTransaction({
        label: 'Invalid rename',
        mutations: [{ type: 'rename-file', path: 'src/App.tsx', name: `bad${highSurrogate}.ts` }],
      }),
    );

    expect(port.service.getState()).toEqual(beforeState);
    expect(port.service.getSnapshot()).toEqual(beforeSnapshot);
    expect(port.service.getTransactionJournal()).toHaveLength(0);
    port.dispose?.();
  });

  it('leaves state, snapshot version, and journal unchanged for invalid create mutations', () => {
    const highSurrogate = String.fromCharCode(0xd800);
    const lowSurrogate = String.fromCharCode(0xdc00);
    const port = createWorkbenchWorkspaceHostPort({
      initialState: { files: [{ path: 'README.md', content: 'original' }] },
    });
    const beforeState = port.service.getState();
    const beforeSnapshot = port.service.getSnapshot();

    port.service.applyTransaction(
      createWorkspaceResourceTransaction({
        label: 'Invalid creates',
        mutations: [
          {
            type: 'create-file',
            path: `src/bad${highSurrogate}.ts`,
            file: { path: `src/bad${highSurrogate}.ts`, content: 'invalid' },
          },
          { type: 'create-folder', path: `src/bad${lowSurrogate}` },
        ],
      }),
    );

    expect(port.service.getState()).toEqual(beforeState);
    expect(port.service.getSnapshot()).toEqual(beforeSnapshot);
    expect(port.service.getTransactionJournal()).toHaveLength(0);
    port.dispose?.();
  });

  it('keeps existing sequential transaction semantics for mixed valid and invalid renames', () => {
    const highSurrogate = String.fromCharCode(0xd800);
    const port = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [
          { path: 'src/App.tsx', content: 'app' },
          { path: 'src/Other.tsx', content: 'other' },
        ],
        folders: ['src'],
      },
    });

    port.service.applyTransaction(
      createWorkspaceResourceTransaction({
        label: 'Mixed rename',
        mutations: [
          { type: 'rename-file', path: 'src/App.tsx', name: 'Renamed.tsx' },
          { type: 'rename-file', path: 'src/Other.tsx', name: `bad${highSurrogate}.tsx` },
        ],
      }),
    );

    expect(
      port.service
        .getState()
        .files.map(({ path }) => path)
        .sort(),
    ).toEqual(['src/Other.tsx', 'src/Renamed.tsx']);
    expect(port.service.getSnapshot().version).toBe(2);
    expect(port.service.getTransactionJournal()).toHaveLength(1);
    port.dispose?.();
  });

  it('filters invalid initial paths while preserving valid entries', () => {
    const highSurrogate = String.fromCharCode(0xd800);
    const lowSurrogate = String.fromCharCode(0xdc00);
    const port = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [
          { path: `src/bad${highSurrogate}.ts`, content: 'invalid' },
          { path: 'src/good-😀.ts', content: 'valid' },
        ],
        folders: ['src', `bad${lowSurrogate}`],
        openPaths: [`src/bad${highSurrogate}.ts`, 'src/good-😀.ts'],
        selectedPath: `src/bad${highSurrogate}.ts`,
      },
    });

    expect(port.service.getState()).toMatchObject({
      files: [{ path: 'src/good-😀.ts', content: 'valid' }],
      openPaths: ['src/good-😀.ts'],
      selectedPath: 'src/good-😀.ts',
    });
    expect(port.service.getState().files.some((file) => file.path.includes(highSurrogate))).toBe(
      false,
    );
    expect(port.service.getTransactionJournal()).toHaveLength(0);
    port.dispose?.();
  });
});
