import { describe, expect, it } from 'vitest';

import { createEditorHostFactoryRegistry } from './host-factory-registry.js';
import { createEditorResolverRegistry } from './editor-resolver-registry.js';
import { saveActiveEditor } from './editor-save.js';
import { createEditorService } from './editor-service.js';
import type { WorkbenchEditorSavePort } from '@workbench-kit/workbench-extension-sdk';

function createRecordingSavePort(
  initialFiles: Array<{ content: string; path: string }> = [],
): WorkbenchEditorSavePort & {
  files: Map<string, string>;
  transactionIds: string[];
} {
  const files = new Map(initialFiles.map((file) => [file.path, file.content]));
  const transactionIds: string[] = [];

  return {
    files,
    transactionIds,
    applySave(resourceUri, content) {
      const path = resourceUri.replace('workspace://file/', '');
      files.set(path, content);
      const transactionId = `tx-${transactionIds.length + 1}`;
      transactionIds.push(transactionId);
      return { transactionId };
    },
    resolveResource(resourceUri) {
      const path = resourceUri.replace('workspace://file/', '');
      const content = files.get(path);
      return content === undefined ? undefined : { content, path };
    },
  };
}

describe('saveActiveEditor', () => {
  it('saves dirty editor content through the editor save port', () => {
    const editorHostFactories = createEditorHostFactoryRegistry();
    editorHostFactories.register({
      id: 'text-editor-host',
      create: ({ resourceUri }) => {
        let content = 'draft';
        return {
          dirty: true,
          dispose() {},
          getContent() {
            return content;
          },
          render: () => resourceUri ?? 'missing-resource',
          setContent(nextContent: string) {
            content = nextContent;
          },
          setDirty() {},
          title: 'Text Editor',
        };
      },
    });

    const editorResolvers = createEditorResolverRegistry();
    editorResolvers.register({
      id: 'workspace-file',
      resolve: () => 'workbench.editor.text',
    });

    const editorSavePort = createRecordingSavePort([{ content: 'original', path: 'src/App.tsx' }]);

    const editorService = createEditorService({
      editorHostFactories,
      editorResolvers,
      resolveEditorResource: (resourceUri) => editorSavePort.resolveResource?.(resourceUri),
    });

    const tab = editorService.openEditor({
      dirty: true,
      pinned: true,
      resourceUri: 'workspace://file/src/App.tsx',
      title: 'App.tsx',
    });

    const host = editorService.createEditorHost(tab.id) as {
      setContent?(content: string): void;
    };
    host.setContent?.('saved content');

    const result = saveActiveEditor({ editorSavePort, editorService });

    expect(result).toEqual({
      resourceUri: 'workspace://file/src/App.tsx',
      saved: true,
      transactionId: 'tx-1',
    });
    expect(editorSavePort.files.get('src/App.tsx')).toBe('saved content');
    expect(editorService.getActiveTab()?.dirty).toBe(false);
    expect(editorSavePort.transactionIds).toHaveLength(1);
  });

  it('skips save when the active tab is clean', () => {
    const editorSavePort = createRecordingSavePort();
    const editorService = createEditorService({
      editorHostFactories: createEditorHostFactoryRegistry(),
      editorResolvers: createEditorResolverRegistry(),
    });

    expect(saveActiveEditor({ editorSavePort, editorService })).toEqual({ saved: false });
    expect(editorSavePort.transactionIds).toHaveLength(0);
  });
});
