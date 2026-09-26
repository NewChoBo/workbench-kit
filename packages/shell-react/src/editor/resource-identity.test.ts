import { describe, expect, it } from 'vitest';

import {
  createEditorHostFactoryRegistry,
  createEditorResolverRegistry,
  createEditorService,
  saveActiveEditor,
} from '@workbench-kit/workbench-core';
import {
  createWorkbenchWorkspaceHostPort,
  formatWorkspaceResourceUri,
} from '@workbench-kit/workspace';

import { TextEditorHost } from '../extensions/builtin/editor/src/text-editor-host.js';
import { normalizeWorkspaceResourceUri } from './resource.js';

describe('workspace editor resource identity integration', () => {
  it('shares one TextEditorHost and saves the latest alias edit to one workspace file', () => {
    const workspaceHost = createWorkbenchWorkspaceHostPort({
      initialState: {
        files: [
          { path: 'src/A.txt', content: 'original' },
          { path: 'src/%41.txt', content: 'literal percent' },
          { path: 'src/한글-日本語.txt', content: 'unicode' },
        ],
      },
    });
    const editorHostFactories = createEditorHostFactoryRegistry();
    editorHostFactories.register({
      id: 'text-editor-host',
      canCreate: ({ editorId }) => editorId === 'workbench.editor.text',
      create: ({ resource, resourceUri }) =>
        new TextEditorHost({
          initialContent:
            typeof resource === 'object' && resource !== null && 'content' in resource
              ? String(resource.content)
              : undefined,
          resourceUri,
        }),
    });
    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      canResolve: ({ resourceUri }) => resourceUri.startsWith('workspace://file/'),
      resolve: () => 'workbench.editor.text',
    });
    const editorService = createEditorService({
      editorHostFactories,
      editorResolvers,
      normalizeResourceUri: normalizeWorkspaceResourceUri,
      resolveEditorResource: workspaceHost.resolveResource,
    });

    const first = editorService.openEditor({ resourceUri: 'workspace://file/src/A.txt' });
    const alias = editorService.openEditor({ resourceUri: 'workspace://file/src/%41.txt' });
    const host = editorService.createEditorHost(first.id) as TextEditorHost;
    host.setContent('first edit');
    host.markDirty();
    editorService.setDirty(first.id, true);

    expect(alias.id).toBe(first.id);
    expect(editorService.getState().groups[0]?.tabs).toHaveLength(1);
    expect(saveActiveEditor({ editorSavePort: workspaceHost, editorService })).toMatchObject({
      resourceUri: 'workspace://file/src/A.txt',
      saved: true,
    });
    expect(workspaceHost.service.getFile('src/A.txt')?.content).toBe('first edit');

    const secondAlias = editorService.openEditor({ resourceUri: 'workspace://file/src/%41.txt' });
    expect(secondAlias.id).toBe(first.id);
    host.setContent('second edit');
    host.markDirty();
    editorService.setDirty(first.id, true);
    expect(saveActiveEditor({ editorSavePort: workspaceHost, editorService })).toMatchObject({
      resourceUri: 'workspace://file/src/A.txt',
      saved: true,
    });
    expect(workspaceHost.service.getFile('src/A.txt')?.content).toBe('second edit');

    const literal = editorService.openEditor({ resourceUri: 'workspace://file/src/%2541.txt' });
    expect(literal.id).not.toBe(first.id);
    expect(editorService.getEditorHost(literal.id)).toBeUndefined();
    const unicodeRaw = editorService.openEditor({
      resourceUri: 'workspace://file/src/한글-日本語.txt',
    });
    const unicodeEncoded = editorService.openEditor({
      resourceUri: formatWorkspaceResourceUri({ kind: 'file', path: 'src/한글-日本語.txt' }),
    });
    expect(unicodeEncoded.id).toBe(unicodeRaw.id);
    expect(editorService.getState().groups[0]?.tabs).toHaveLength(3);
    workspaceHost.dispose?.();
    editorService.dispose();
  });
});
