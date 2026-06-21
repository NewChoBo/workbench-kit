import { describe, expect, it } from 'vitest';
import type { EditorGroupState, EditorLayoutNode } from '@workbench-kit/workbench-core';

import { getResourceLabel, pruneEditorLayout, toEditorTabModel } from './editor-area-model.js';

describe('editor-area-model', () => {
  it('prunes stale editor layout groups and collapses single-child splits', () => {
    const layout: EditorLayoutNode = {
      children: [
        { groupId: 'main', type: 'group' },
        {
          children: [
            { groupId: 'stale', type: 'group' },
            { groupId: 'side', type: 'group' },
          ],
          direction: 'vertical',
          primarySizePercent: 40,
          type: 'split',
        },
      ],
      direction: 'horizontal',
      primarySizePercent: 60,
      type: 'split',
    };
    const groupsById = new Map<string, EditorGroupState>([
      ['main', createGroup('main')],
      ['side', createGroup('side')],
    ]);

    expect(pruneEditorLayout(layout, groupsById)).toEqual({
      children: [
        { groupId: 'main', type: 'group' },
        { groupId: 'side', type: 'group' },
      ],
      direction: 'horizontal',
      primarySizePercent: 60,
      type: 'split',
    });
  });

  it('returns null when every layout group is stale', () => {
    expect(pruneEditorLayout({ groupId: 'stale', type: 'group' }, new Map())).toBeNull();
  });

  it('creates editor tab view models from editor tab state', () => {
    expect(
      toEditorTabModel(
        {
          dirty: true,
          editorId: 'workbench-kit.builtin.editor.text',
          id: 'tab-1',
          pinned: false,
          preview: true,
          resourceUri: 'workspace://file/src/App.tsx',
        },
        'after',
      ),
    ).toEqual(
      expect.objectContaining({
        closable: true,
        dirty: true,
        dropPosition: 'after',
        fileIconKind: 'typescript',
        id: 'tab-1',
        label: 'App.tsx',
        preview: true,
        title: 'workspace://file/src/App.tsx',
      }),
    );
  });

  it('uses the final resource path segment as the fallback label', () => {
    expect(getResourceLabel('workspace://file/docs/README.md')).toBe('README.md');
  });
});

function createGroup(id: string): EditorGroupState {
  return {
    activeTabId: undefined,
    id,
    tabs: [],
  };
}
