import { describe, expect, it } from 'vitest';

import { createEditorHostFactoryRegistry } from './host-factory-registry.js';
import { createEditorResolverRegistry } from './editor-resolver-registry.js';
import { createEditorService, DEFAULT_EDITOR_GROUP_ID } from './editor-service.js';

describe('EditorResolverRegistry', () => {
  it('resolves editor ids by priority', () => {
    const registry = createEditorResolverRegistry();
    registry.register({
      id: 'fallback',
      priority: 0,
      resolve: () => 'workbench.editor.fallback',
    });
    registry.register({
      id: 'workspace-file',
      priority: 10,
      canResolve: ({ resourceUri }) => resourceUri.startsWith('workspace://file/'),
      resolve: () => 'workbench.editor.text',
    });

    expect(registry.resolveEditorId({ resourceUri: 'workspace://file/src/app.ts' })).toBe(
      'workbench.editor.text',
    );
    expect(registry.resolveEditorId({ resourceUri: 'custom://resource' })).toBe(
      'workbench.editor.fallback',
    );
  });
});

describe('EditorService', () => {
  it('opens editors, focuses existing tabs, and creates hosts through factories', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    editorHostFactories.register({
      id: 'text-editor-host',
      create: ({ resourceUri }) => ({
        dispose() {},
        render: () => resourceUri ?? 'missing-resource',
        title: 'Text Editor',
      }),
    });

    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const service = createEditorService({
      editorHostFactories,
      editorResolvers,
    });

    const opened = service.openEditor({
      preview: true,
      resourceUri: 'workspace://file/src/app.ts',
      title: 'app.ts',
    });

    expect(opened.preview).toBe(true);
    expect(opened.pinned).toBe(false);
    expect(opened.editorId).toBe('workbench.editor.text');
    expect(service.getState().groups[0]?.activeTabId).toBe(opened.id);

    const refocused = service.openEditor({
      resourceUri: 'workspace://file/src/app.ts',
    });
    expect(refocused.id).toBe(opened.id);
    expect(service.getState().groups[0]?.tabs).toHaveLength(1);

    expect(service.createEditorHost(opened.id)?.render()).toBe('workspace://file/src/app.ts');
  });

  it('replaces preview tabs and promotes preview tabs on edit', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const service = createEditorService({
      editorHostFactories,
      editorResolvers,
    });

    const firstPreview = service.openEditor({
      preview: true,
      resourceUri: 'workspace://file/a.ts',
    });
    const secondPreview = service.openEditor({
      preview: true,
      resourceUri: 'workspace://file/b.ts',
    });

    expect(service.getState().groups[0]?.tabs).toHaveLength(1);
    expect(secondPreview.id).not.toBe(firstPreview.id);

    service.promotePreviewOnEdit(secondPreview.id);
    const tab = service.getState().groups[0]?.tabs[0];
    expect(tab?.preview).toBe(false);
    expect(tab?.pinned).toBe(true);

    service.togglePinnedEditor(secondPreview.id);
    const unpinned = service.getState().groups[0]?.tabs[0];
    expect(unpinned?.preview).toBe(true);
    expect(unpinned?.pinned).toBe(false);

    service.togglePinnedEditor(secondPreview.id);
    const pinnedAgain = service.getState().groups[0]?.tabs[0];
    expect(pinnedAgain?.preview).toBe(false);
    expect(pinnedAgain?.pinned).toBe(true);
  });

  it('tracks dirty state and closes tabs', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const service = createEditorService({
      editorHostFactories,
      editorResolvers,
    });

    const tab = service.openEditor({
      pinned: true,
      resourceUri: 'workspace://file/src/app.ts',
    });

    service.setDirty(tab.id, true);
    expect(service.getActiveTab()?.dirty).toBe(true);

    service.closeEditor(tab.id);
    expect(service.getState().groups).toEqual([
      {
        activeTabId: undefined,
        id: DEFAULT_EDITOR_GROUP_ID,
        tabs: [],
      },
    ]);
  });

  it('splits the active editor into a new group', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    editorHostFactories.register({
      id: 'stateful-text-editor-host',
      create: ({ resourceUri }) => {
        let content = `content for ${resourceUri}`;
        let dirty = false;

        return {
          dispose() {},
          getContent: () => content,
          render: () => content,
          setContent: (nextContent: string) => {
            content = nextContent;
          },
          setDirty: (nextDirty: boolean) => {
            dirty = nextDirty;
          },
          get dirty() {
            return dirty;
          },
        };
      },
    });

    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const service = createEditorService({
      editorHostFactories,
      editorResolvers,
    });

    const opened = service.openEditor({
      preview: true,
      resourceUri: 'workspace://file/src/app.ts',
      title: 'app.ts',
    });
    const sourceHost = service.createEditorHost(opened.id) as
      | {
          setContent(nextContent: string): void;
          setDirty(nextDirty: boolean): void;
        }
      | undefined;
    sourceHost?.setContent('unsaved split content');
    sourceHost?.setDirty(true);
    service.setDirty(opened.id, true);

    const split = service.splitEditor();
    const state = service.getState();

    expect(split).toBeDefined();
    expect(split?.id).not.toBe(opened.id);
    expect(split?.resourceUri).toBe(opened.resourceUri);
    expect(split?.preview).toBe(false);
    expect(split?.pinned).toBe(true);
    expect(split?.dirty).toBe(true);
    expect(state.groups).toHaveLength(2);
    expect(state.groups[0]?.tabs.map((tab) => tab.id)).toEqual([opened.id]);
    expect(state.groups[1]?.tabs.map((tab) => tab.id)).toEqual([split?.id]);
    expect(state.activeGroupId).toBe(state.groups[1]?.id);
    expect(state.layout).toEqual({
      children: state.groups.map((group) => ({ groupId: group.id, type: 'group' })),
      direction: 'horizontal',
      type: 'split',
    });
    expect(service.createEditorHost(split?.id ?? '')?.render()).toBe('unsaved split content');

    const inserted = service.splitEditor({
      beforeGroupId: state.groups[1]?.id,
      tabId: opened.id,
    });
    const nextState = service.getState();

    expect(inserted).toBeDefined();
    expect(nextState.groups).toHaveLength(3);
    expect(nextState.groups.map((group) => group.tabs[0]?.id)).toEqual([
      opened.id,
      inserted?.id,
      split?.id,
    ]);
    expect(nextState.layout).toEqual({
      children: nextState.groups.map((group) => ({ groupId: group.id, type: 'group' })),
      direction: 'horizontal',
      type: 'split',
    });

    const verticalSplit = service.splitEditor({
      afterGroupId: nextState.groups[2]?.id,
      direction: 'vertical',
      tabId: opened.id,
    });
    const verticalState = service.getState();

    expect(verticalSplit).toBeDefined();
    expect(verticalState.groups).toHaveLength(4);
    expect(verticalState.layout).toEqual({
      children: [
        { groupId: verticalState.groups[0]?.id, type: 'group' },
        { groupId: verticalState.groups[1]?.id, type: 'group' },
        {
          children: [
            { groupId: verticalState.groups[2]?.id, type: 'group' },
            { groupId: verticalState.groups[3]?.id, type: 'group' },
          ],
          direction: 'vertical',
          type: 'split',
        },
      ],
      direction: 'horizontal',
      type: 'split',
    });
  });

  it('preserves nested split intent when splitting with a different direction', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const service = createEditorService({
      editorHostFactories,
      editorResolvers,
    });

    const opened = service.openEditor({
      pinned: true,
      resourceUri: 'workspace://file/src/app.ts',
      title: 'app.ts',
    });
    const splitDown = service.splitEditor({
      direction: 'vertical',
      tabId: opened.id,
    });
    const splitDownState = service.getState();
    const lowerGroupId = splitDownState.groups[1]?.id;

    expect(splitDown).toBeDefined();
    expect(splitDownState.layout).toEqual({
      children: splitDownState.groups.map((group) => ({ groupId: group.id, type: 'group' })),
      direction: 'vertical',
      type: 'split',
    });

    const splitRight = service.splitEditor({
      afterGroupId: lowerGroupId,
      direction: 'horizontal',
      tabId: opened.id,
    });
    const nestedState = service.getState();

    expect(splitRight).toBeDefined();
    expect(nestedState.groups).toHaveLength(3);
    expect(nestedState.layout).toEqual({
      children: [
        { groupId: nestedState.groups[0]?.id, type: 'group' },
        {
          children: [
            { groupId: nestedState.groups[1]?.id, type: 'group' },
            { groupId: nestedState.groups[2]?.id, type: 'group' },
          ],
          direction: 'horizontal',
          type: 'split',
        },
      ],
      direction: 'vertical',
      type: 'split',
    });
  });

  it('moves editor tabs between groups without duplicating hosts', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    editorHostFactories.register({
      id: 'stateful-text-editor-host',
      create: ({ resourceUri }) => {
        let content = `content for ${resourceUri}`;

        return {
          dispose() {},
          getContent: () => content,
          render: () => content,
          setContent: (nextContent: string) => {
            content = nextContent;
          },
        };
      },
    });

    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const service = createEditorService({
      editorHostFactories,
      editorResolvers,
    });

    const first = service.openEditor({
      pinned: true,
      resourceUri: 'workspace://file/src/app.ts',
      title: 'app.ts',
    });
    const second = service.openEditor({
      pinned: true,
      resourceUri: 'workspace://file/README.md',
      title: 'README.md',
    });
    const firstHost = service.createEditorHost(first.id) as
      | { render(): unknown; setContent(nextContent: string): void }
      | undefined;
    firstHost?.setContent('moved content');

    const moved = service.moveEditor({
      afterGroupId: DEFAULT_EDITOR_GROUP_ID,
      direction: 'vertical',
      tabId: first.id,
    });
    const splitState = service.getState();
    const targetGroup = splitState.groups[1];

    expect(moved?.id).toBe(first.id);
    expect(splitState.groups).toHaveLength(2);
    expect(splitState.groups[0]?.tabs.map((tab) => tab.id)).toEqual([second.id]);
    expect(targetGroup?.tabs.map((tab) => tab.id)).toEqual([first.id]);
    expect(splitState.activeGroupId).toBe(targetGroup?.id);
    expect(splitState.layout).toEqual({
      children: splitState.groups.map((group) => ({ groupId: group.id, type: 'group' })),
      direction: 'vertical',
      type: 'split',
    });
    expect(service.createEditorHost(first.id)).toBe(firstHost);
    expect(service.createEditorHost(first.id)?.render()).toBe('moved content');

    service.moveEditor({
      groupId: DEFAULT_EDITOR_GROUP_ID,
      tabId: first.id,
    });
    const mergedState = service.getState();

    expect(mergedState.groups).toEqual([
      {
        activeTabId: first.id,
        id: DEFAULT_EDITOR_GROUP_ID,
        tabs: [second, first],
      },
    ]);
    expect(mergedState.layout).toEqual({
      groupId: DEFAULT_EDITOR_GROUP_ID,
      type: 'group',
    });
    expect(service.createEditorHost(first.id)).toBe(firstHost);
  });

  it('stores editor split direction and primary size in the service layout', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const service = createEditorService({
      editorHostFactories,
      editorResolvers,
    });

    const first = service.openEditor({
      pinned: true,
      resourceUri: 'workspace://file/src/app.ts',
      title: 'app.ts',
    });
    const split = service.splitEditor();

    expect(split).toBeDefined();

    service.setEditorSplitPrimarySize({
      path: [],
      primarySizePercent: 64.5,
    });
    service.setEditorSplitDirection({
      direction: 'vertical',
      path: [],
    });

    const resizedState = service.getState();
    expect(resizedState.layout).toEqual({
      children: resizedState.groups.map((group) => ({ groupId: group.id, type: 'group' })),
      direction: 'vertical',
      primarySizePercent: 64.5,
      type: 'split',
    });

    service.setActiveEditor(first.id);
    service.setDirty(first.id, true);

    const updatedState = service.getState();
    expect(updatedState.layout).toEqual({
      children: updatedState.groups.map((group) => ({ groupId: group.id, type: 'group' })),
      direction: 'vertical',
      primarySizePercent: 64.5,
      type: 'split',
    });

    const secondSplit = service.splitEditor({
      afterGroupId: updatedState.groups[1]?.id,
      tabId: first.id,
    });
    const expandedState = service.getState();

    expect(secondSplit).toBeDefined();
    expect(expandedState.groups).toHaveLength(3);
    expect(expandedState.layout).toEqual({
      children: expandedState.groups.map((group) => ({ groupId: group.id, type: 'group' })),
      direction: 'vertical',
      primarySizePercent: 64.5,
      type: 'split',
    });

    service.setEditorSplitPrimarySize({
      path: [],
      primarySizePercent: Number.POSITIVE_INFINITY,
    });

    expect(service.getState().layout).toEqual({
      children: expandedState.groups.map((group) => ({ groupId: group.id, type: 'group' })),
      direction: 'vertical',
      primarySizePercent: 50,
      type: 'split',
    });
  });

  it('restores editor state and continues group/tab sequences without collisions', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const service = createEditorService({
      editorHostFactories,
      editorResolvers,
      initialState: {
        activeGroupId: 'workbench.editor.group.7',
        groups: [
          {
            activeTabId: 'workbench.editor.tab.5',
            id: 'workbench.editor.group.main',
            tabs: [
              {
                dirty: false,
                editorId: 'workbench.editor.text',
                id: 'workbench.editor.tab.5',
                pinned: true,
                preview: false,
                resourceUri: 'workspace://file/src/app.ts',
                title: 'app.ts',
              },
            ],
          },
          {
            activeTabId: 'workbench.editor.tab.9',
            id: 'workbench.editor.group.7',
            tabs: [
              {
                dirty: false,
                editorId: 'workbench.editor.text',
                id: 'workbench.editor.tab.9',
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
            {
              children: [
                { groupId: 'workbench.editor.group.7', type: 'group' },
                { groupId: 'stale-group', type: 'group' },
              ],
              direction: 'horizontal',
              type: 'split',
            },
          ],
          direction: 'vertical',
          primarySizePercent: 62,
          type: 'split',
        },
      },
    });

    expect(service.getState()).toEqual({
      activeGroupId: 'workbench.editor.group.7',
      groups: [
        {
          activeTabId: 'workbench.editor.tab.5',
          id: 'workbench.editor.group.main',
          tabs: [
            {
              dirty: false,
              editorId: 'workbench.editor.text',
              id: 'workbench.editor.tab.5',
              pinned: true,
              preview: false,
              resourceUri: 'workspace://file/src/app.ts',
              title: 'app.ts',
            },
          ],
        },
        {
          activeTabId: 'workbench.editor.tab.9',
          id: 'workbench.editor.group.7',
          tabs: [
            {
              dirty: false,
              editorId: 'workbench.editor.text',
              id: 'workbench.editor.tab.9',
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
          { groupId: 'workbench.editor.group.7', type: 'group' },
        ],
        direction: 'vertical',
        primarySizePercent: 62,
        type: 'split',
      },
    });

    const nextTab = service.openEditor({
      editorId: 'workbench.editor.text',
      resourceUri: 'workspace://file/src/next.ts',
      title: 'next.ts',
    });

    expect(nextTab.id).toBe('workbench.editor.tab.10');

    const split = service.splitEditor({
      direction: 'horizontal',
      tabId: nextTab.id,
    });

    expect(split?.id).toBe('workbench.editor.tab.11');
    expect(service.getState().groups.some((group) => group.id === 'workbench.editor.group.8')).toBe(
      true,
    );
  });

  it('reorders editor tabs within the same group', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const service = createEditorService({
      editorHostFactories,
      editorResolvers,
    });

    const first = service.openEditor({
      pinned: true,
      resourceUri: 'workspace://file/a.ts',
      title: 'a.ts',
    });
    const second = service.openEditor({
      pinned: true,
      resourceUri: 'workspace://file/b.ts',
      title: 'b.ts',
    });
    const third = service.openEditor({
      pinned: true,
      resourceUri: 'workspace://file/c.ts',
      title: 'c.ts',
    });

    service.moveEditor({
      groupId: DEFAULT_EDITOR_GROUP_ID,
      tabId: third.id,
      targetIndex: 0,
    });

    expect(service.getState().groups[0]?.tabs.map((tab) => tab.id)).toEqual([
      third.id,
      first.id,
      second.id,
    ]);
    expect(service.getState().groups[0]?.activeTabId).toBe(third.id);

    service.moveEditor({
      groupId: DEFAULT_EDITOR_GROUP_ID,
      tabId: third.id,
      targetIndex: 3,
    });

    expect(service.getState().groups[0]?.tabs.map((tab) => tab.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ]);

    service.moveEditor({
      groupId: DEFAULT_EDITOR_GROUP_ID,
      tabId: first.id,
    });

    expect(service.getState().groups[0]?.tabs.map((tab) => tab.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ]);
  });

  it('marks workspace file tabs missing when resources are unavailable', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    editorHostFactories.register({
      id: 'text-editor-host',
      create: ({ resourceUri }) => ({
        dispose() {},
        render: () => resourceUri ?? 'missing-resource',
        title: 'Text Editor',
      }),
    });

    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const service = createEditorService({
      editorHostFactories,
      editorResolvers,
    });

    const opened = service.openEditor({
      dirty: true,
      resourceUri: 'workspace://file/src/app.ts',
      title: 'app.ts',
    });

    service.createEditorHost(opened.id);
    service.reconcileWorkspaceFileTabs(() => false);

    expect(service.getState().groups[0]?.tabs[0]).toMatchObject({
      dirty: false,
      id: opened.id,
      resourceMissing: true,
    });

    service.reconcileWorkspaceFileTabs((resourceUri) => resourceUri === 'workspace://file/src/app.ts');

    expect(service.getState().groups[0]?.tabs[0]).toMatchObject({
      dirty: false,
      id: opened.id,
    });
    expect(service.getState().groups[0]?.tabs[0]).not.toHaveProperty('resourceMissing');
  });
});
