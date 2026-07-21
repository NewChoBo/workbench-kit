import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  readPersistedEditorState,
  writePersistedEditorState,
} from './editor-state-storage.js';

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
});
