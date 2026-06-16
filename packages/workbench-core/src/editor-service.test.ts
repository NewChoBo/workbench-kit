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
});
