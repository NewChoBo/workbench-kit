import { describe, expect, it } from 'vitest';
import type { EditorState } from '@workbench-kit/workbench-core';
import {
  createWorkbenchWorkspaceHostPort,
  formatWorkspaceResourceUri,
} from '@workbench-kit/workspace';

import {
  DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  readPersistedEditorState,
  readPersistedEditorStateResult,
  writePersistedEditorState,
} from './state-storage.js';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe('editor-state-storage', () => {
  it.each([
    ['%41.txt', 'A.txt', '%2541.txt'],
    ['%20.txt', ' .txt', '%2520.txt'],
  ])(
    'migrates the legacy %s tab without reading or saving its decoded neighbor',
    (literal, neighbor, encoded) => {
      const storage = createMemoryStorage();
      const original = JSON.stringify(stateForUris([`workspace://file/src/${literal}`]));
      storage.setItem(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY, original);
      const host = createWorkbenchWorkspaceHostPort({
        initialState: {
          files: [
            { path: `src/${literal}`, content: 'Literal file' },
            { path: `src/${neighbor}`, content: 'Neighbor file' },
          ],
        },
      });

      const restored = readPersistedEditorState(undefined, storage)!;
      const uri = restored.groups[0]!.tabs[0]!.resourceUri;
      expect(uri).toBe(`workspace://file/src/${encoded}`);
      expect(host.resolveResource?.(uri)).toMatchObject({
        path: `src/${literal}`,
        content: 'Literal file',
      });
      expect(storage.getItem(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY)).toBe(original);
      host.applySave(uri, 'Edited literal');
      expect(host.service.getFile(`src/${literal}`)?.content).toBe('Edited literal');
      expect(host.service.getFile(`src/${neighbor}`)?.content).toBe('Neighbor file');
      expect(restored.groups[0]!.activeTabId).toBe('tab-0');
      host.dispose?.();
    },
  );

  it('marks new URI encoding and restores it repeatedly without double migration', () => {
    const storage = createMemoryStorage();
    const paths = ['src/다국어 日本語.ts', 'src/%41.txt', 'src/a?#.txt'];
    const uris = paths.map((path) => formatWorkspaceResourceUri({ kind: 'file', path }));
    const host = createWorkbenchWorkspaceHostPort({
      initialState: { files: paths.map((path) => ({ path, content: path })) },
    });
    let state = stateForUris(uris);
    for (let index = 0; index < 2; index += 1) {
      writePersistedEditorState(state, undefined, storage);
      expect(
        JSON.parse(storage.getItem(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY)!),
      ).toHaveProperty('workspaceResourceUriEncoding', 'percent-encoded-v1');
      state = readPersistedEditorState(undefined, storage)!;
      expect(state.groups[0]!.tabs.map((tab) => tab.resourceUri)).toEqual(uris);
      state.groups[0]!.tabs.forEach((tab, fileIndex) => {
        expect(host.resolveResource?.(tab.resourceUri)).toMatchObject({
          path: paths[fileIndex],
          content: paths[fileIndex],
        });
      });
    }
    host.dispose?.();
  });

  it.each([
    ['leading space', ' workspace://file/src/%41.txt'],
    ['embedded tab', 'work\tspace://file/src/%41.txt'],
  ])('normalizes %s before classifying a legacy workspace URI', (_label, uri) => {
    const storage = createMemoryStorage();
    storage.setItem(
      DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
      JSON.stringify(stateForUris([uri])),
    );
    const restoredUri = readPersistedEditorState(undefined, storage)!.groups[0]!.tabs[0]!
      .resourceUri;
    expect(restoredUri).toBe('workspace://file/src/%2541.txt');
    const host = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [
          { path: 'src/%41.txt', content: 'Literal' },
          { path: 'src/A.txt', content: 'Neighbor' },
        ],
      },
    });
    host.applySave(restoredUri, 'Changed literal');
    expect(host.service.getFile('src/%41.txt')?.content).toBe('Changed literal');
    expect(host.service.getFile('src/A.txt')?.content).toBe('Neighbor');
    host.dispose?.();
  });

  it('rejects marked malformed workspace URIs while retaining opaque host resources', () => {
    const storage = createMemoryStorage();
    const state = stateForUris([' workspace://file/src/%GG', 'opaque-host-document']);
    storage.setItem(
      DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
      JSON.stringify({ ...state, workspaceResourceUriEncoding: 'percent-encoded-v1' }),
    );
    expect(
      readPersistedEditorState(undefined, storage)?.groups[0]!.tabs.map((tab) => tab.resourceUri),
    ).toEqual(['opaque-host-document']);
  });

  it('keeps non-workspace legacy URIs unchanged and rejects unknown encoding versions', () => {
    const storage = createMemoryStorage();
    const state = stateForUris(['custom://document/%41.txt', 'workspace://file/src/plain.ts']);
    storage.setItem(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY, JSON.stringify(state));
    expect(
      readPersistedEditorState(undefined, storage)?.groups[0]!.tabs.map((tab) => tab.resourceUri),
    ).toEqual(state.groups[0]!.tabs.map((tab) => tab.resourceUri));
    storage.setItem(
      DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
      JSON.stringify({ ...state, workspaceResourceUriEncoding: 'unknown-future' }),
    );
    expect(readPersistedEditorState(undefined, storage)).toBeUndefined();
  });

  it('drops invalid legacy workspace identities without altering the stored bytes', () => {
    const storage = createMemoryStorage();
    const original = JSON.stringify(
      stateForUris(['workspace://other/src/a.ts', 'workspace://file/']),
    );
    storage.setItem(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY, original);
    expect(readPersistedEditorState(undefined, storage)?.groups[0]!.tabs).toEqual([]);
    expect(storage.getItem(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY)).toBe(original);
  });

  it('round-trips editor state through storage', () => {
    const storage = createMemoryStorage();

    writePersistedEditorState(
      {
        activeGroupId: 'workbench.editor.group.1',
        groups: [
          {
            activeTabId: 'workbench.editor.tab.1',
            id: 'workbench.editor.group.main',
            tabs: [
              {
                dirty: true,
                editorId: 'workbench.editor.text',
                id: 'workbench.editor.tab.1',
                pinned: true,
                preview: false,
                resourceUri: 'workspace://file/src/app.ts',
                title: 'app.ts',
              },
            ],
          },
          {
            activeTabId: 'workbench.editor.tab.2',
            id: 'workbench.editor.group.1',
            tabs: [
              {
                dirty: false,
                editorId: 'workbench.editor.text',
                id: 'workbench.editor.tab.2',
                pinned: true,
                preview: false,
                resourceUri: 'workspace://file/README.md',
                title: 'README.md',
              },
            ],
          },
        ],
        layout: {
          children: [
            { groupId: 'workbench.editor.group.main', type: 'group' },
            { groupId: 'workbench.editor.group.1', type: 'group' },
          ],
          direction: 'vertical',
          primarySizePercent: 58,
          type: 'split',
        },
      },
      DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
      storage,
    );

    expect(readPersistedEditorState(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY, storage)).toEqual({
      activeGroupId: 'workbench.editor.group.1',
      groups: [
        {
          activeTabId: 'workbench.editor.tab.1',
          id: 'workbench.editor.group.main',
          tabs: [
            {
              dirty: false,
              editorId: 'workbench.editor.text',
              id: 'workbench.editor.tab.1',
              pinned: true,
              preview: false,
              resourceUri: 'workspace://file/src/app.ts',
              title: 'app.ts',
            },
          ],
        },
        {
          activeTabId: 'workbench.editor.tab.2',
          id: 'workbench.editor.group.1',
          tabs: [
            {
              dirty: false,
              editorId: 'workbench.editor.text',
              id: 'workbench.editor.tab.2',
              pinned: true,
              preview: false,
              resourceUri: 'workspace://file/README.md',
              title: 'README.md',
            },
          ],
        },
      ],
      layout: {
        children: [
          { groupId: 'workbench.editor.group.main', type: 'group' },
          { groupId: 'workbench.editor.group.1', type: 'group' },
        ],
        direction: 'vertical',
        primarySizePercent: 58,
        type: 'split',
      },
    });
  });

  it('ignores invalid persisted editor state payloads', () => {
    const storage = createMemoryStorage();
    storage.setItem(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY, '{not-json');

    expect(readPersistedEditorState(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY, storage)).toBe(
      undefined,
    );

    storage.setItem(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY, JSON.stringify({ groups: [] }));
    expect(readPersistedEditorState(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY, storage)).toBe(
      undefined,
    );
  });

  it('reports missing and valid state as writable, while locking rejected state', () => {
    const storage = createMemoryStorage();
    expect(readPersistedEditorStateResult('missing', storage)).toMatchObject({
      value: undefined,
      writeEligible: true,
    });

    const valid = stateForUris(['workspace://file/src/App.tsx']);
    storage.setItem(
      'valid',
      JSON.stringify({ ...valid, workspaceResourceUriEncoding: 'percent-encoded-v1' }),
    );
    expect(readPersistedEditorStateResult('valid', storage)).toMatchObject({
      writeEligible: true,
      value: valid,
    });

    const original = JSON.stringify({ ...valid, workspaceResourceUriEncoding: 'future-v2' });
    storage.setItem('future', original);
    const rejected = readPersistedEditorStateResult('future', storage);
    expect(rejected).toMatchObject({ writeEligible: false, value: undefined });
    expect(rejected.diagnostic?.code).toBe('decode_failed');
    expect(storage.getItem('future')).toBe(original);

    storage.setItem(
      'invalid-uri',
      JSON.stringify({
        ...valid,
        workspaceResourceUriEncoding: 'percent-encoded-v1',
        groups: [
          {
            ...valid.groups[0],
            tabs: [{ ...valid.groups[0]!.tabs[0], resourceUri: 'workspace://file/src/%GG' }],
          },
        ],
      }),
    );
    expect(readPersistedEditorStateResult('invalid-uri', storage)).toMatchObject({
      writeEligible: false,
    });
  });
});

function stateForUris(uris: string[]): EditorState {
  return {
    activeGroupId: 'main',
    groups: [
      {
        id: 'main',
        activeTabId: 'tab-0',
        tabs: uris.map((resourceUri, index) => ({
          id: `tab-${index}`,
          editorId: 'workbench.editor.text',
          resourceUri,
          dirty: false,
          pinned: true,
          preview: false,
        })),
      },
    ],
    layout: { type: 'group', groupId: 'main' },
  };
}
