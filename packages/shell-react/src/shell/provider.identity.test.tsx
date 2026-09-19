/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useEditorService } from '../editor/use-editor.js';
import { EditorStateInitializationError } from '@workbench-kit/workbench-core';

import { DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY } from '../editor/state-storage.js';
import { WorkbenchProvider } from './provider.js';

function createMemoryStorage() {
  const values = new Map<string, string>();
  let writes = 0;
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      writes += 1;
      values.set(key, value);
    },
    get writes() {
      return writes;
    },
    set(key: string, value: string) {
      values.set(key, value);
    },
  };
}

function StateProbe({
  onState,
}: {
  onState: (state: {
    activeTabId: string | undefined;
    tabs: readonly { id: string; resourceUri: string }[] | undefined;
  }) => void;
}) {
  const state = useEditorService().getState();
  const group = state.groups[0];
  onState({
    activeTabId: group?.activeTabId,
    tabs: group?.tabs.map(({ id, resourceUri }) => ({ id, resourceUri })),
  });
  return null;
}

describe('WorkbenchProvider editor resource identity', () => {
  it('restores clean persisted aliases as one canonical active tab', () => {
    const storage = createMemoryStorage();
    storage.set(
      DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
      JSON.stringify({
        workspaceResourceUriEncoding: 'percent-encoded-v1',
        activeGroupId: 'main',
        groups: [
          {
            activeTabId: 'tab-2',
            id: 'main',
            tabs: [
              {
                dirty: false,
                editorId: 'workbench.editor.text',
                id: 'tab-1',
                pinned: true,
                preview: false,
                resourceUri: 'workspace://file/src/A.txt',
              },
              {
                dirty: false,
                editorId: 'workbench.editor.text',
                id: 'tab-2',
                pinned: true,
                preview: false,
                resourceUri: 'workspace://file/src/%41.txt',
              },
            ],
          },
        ],
        layout: { groupId: 'main', type: 'group' },
      }),
    );

    let observed:
      | {
          activeTabId: string | undefined;
          tabs: readonly { id: string; resourceUri: string }[] | undefined;
        }
      | undefined;
    renderToStaticMarkup(
      <WorkbenchProvider availableExtensions={[]} editorStateStorage={storage} persistEditorState>
        <StateProbe onState={(state) => (observed = state)} />
      </WorkbenchProvider>,
    );

    expect(observed).toEqual({
      activeTabId: 'tab-2',
      tabs: [{ id: 'tab-2', resourceUri: 'workspace://file/src/A.txt' }],
    });
    expect(storage.writes).toBe(0);
  });

  it('keeps ordinary alias opens on one tab through provider wiring', () => {
    let observed: { first: string; alias: string } | undefined;
    function OpenProbe() {
      const service = useEditorService();
      const first = service.openEditor({
        editorId: 'workbench.editor.text',
        resourceUri: 'workspace://file/src/A.txt',
      });
      const alias = service.openEditor({
        editorId: 'workbench.editor.text',
        resourceUri: 'workspace://file/src/%41.txt',
      });
      observed = { first: first.id, alias: alias.id };
      return null;
    }

    renderToStaticMarkup(
      <WorkbenchProvider availableExtensions={[]}>
        <OpenProbe />
      </WorkbenchProvider>,
    );

    expect(observed).toEqual({
      first: 'workbench.editor.tab.1',
      alias: 'workbench.editor.tab.1',
    });
  });

  it('rejects dirty initial aliases before persistence can write', () => {
    const storage = createMemoryStorage();
    const original = JSON.stringify({ untouched: true });
    storage.set(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY, original);
    const initialEditorState = {
      activeGroupId: 'main',
      groups: [
        {
          activeTabId: 'tab-1',
          id: 'main',
          tabs: [
            {
              dirty: true,
              editorId: 'workbench.editor.text',
              id: 'tab-1',
              pinned: true,
              preview: false,
              resourceUri: 'workspace://file/src/A.txt',
            },
            {
              dirty: true,
              editorId: 'workbench.editor.text',
              id: 'tab-2',
              pinned: true,
              preview: false,
              resourceUri: 'workspace://file/src/%41.txt',
            },
          ],
        },
      ],
      layout: { groupId: 'main', type: 'group' as const },
    };

    expect(() =>
      renderToStaticMarkup(
        <WorkbenchProvider
          availableExtensions={[]}
          editorStateStorage={storage}
          initialEditorState={initialEditorState}
          persistEditorState
        >
          <StateProbe onState={() => undefined} />
        </WorkbenchProvider>,
      ),
    ).toThrow(EditorStateInitializationError);
    expect(storage.getItem(DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY)).toBe(original);
    expect(storage.writes).toBe(0);
  });
});
