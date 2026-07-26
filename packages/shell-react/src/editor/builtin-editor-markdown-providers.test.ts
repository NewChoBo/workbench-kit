import { describe, expect, it } from 'vitest';
import { BUILTIN_WORKBENCH_EXTENSIONS, ExtensionRegistry } from '@workbench-kit/workbench-core';

describe('builtin.editor markdown document view provider', () => {
  it('registers markdown preview provider on startup activation', async () => {
    const extension = BUILTIN_WORKBENCH_EXTENSIONS.find(
      (candidate) => candidate.manifest.id === 'workbench-kit.builtin.editor',
    );
    expect(extension).toBeDefined();

    const registry = new ExtensionRegistry();
    registry.registerExtension(extension!);
    await registry.activateStartup();

    const providers = registry.editorDocumentViews.getProviders();
    expect(providers.map((provider) => provider.id)).toEqual([
      'workbench-kit.builtin.editor.markdown-preview',
    ]);

    const markdownDocument = {
      content: '# Notes',
      mimeType: 'text/markdown',
      path: 'docs/notes.md',
      resourceUri: 'workspace://file/docs/notes.md',
    };
    const mdxDocument = {
      content: '# MDX',
      path: 'docs/notes.mdx',
      resourceUri: 'workspace://file/docs/notes.mdx',
    };

    expect(providers[0]?.matches?.(markdownDocument)).toBe(true);
    expect(providers[0]?.matches?.(mdxDocument)).toBe(true);
    expect(
      providers[0]?.render({
        document: markdownDocument,
        onContentChange: () => undefined,
      }),
    ).toEqual({
      kind: 'workbench-kit.builtin.editor.markdown-preview',
    });
  });
});
