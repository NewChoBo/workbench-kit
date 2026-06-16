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
      tabId: first.id,
    });
    const splitState = service.getState();
    const targetGroup = splitState.groups[1];

    expect(moved?.id).toBe(first.id);
    expect(splitState.groups).toHaveLength(2);
    expect(splitState.groups[0]?.tabs.map((tab) => tab.id)).toEqual([second.id]);
    expect(targetGroup?.tabs.map((tab) => tab.id)).toEqual([first.id]);
    expect(splitState.activeGroupId).toBe(targetGroup?.id);
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
    expect(service.createEditorHost(first.id)).toBe(firstHost);
  });
});
