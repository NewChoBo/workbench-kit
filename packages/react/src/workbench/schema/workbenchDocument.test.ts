import { describe, expect, it } from 'vitest';
import { createPatchFromWorkbenchDocumentAction } from './workbenchDocumentActions';
import { applyWorkbenchDocumentPatch } from './workbenchDocumentPatch';
import {
  workspaceFilesToDocument,
  documentNodesToWorkspaceFiles,
} from './workbenchDocumentAdapter';

describe('WorkbenchDocument adapter', () => {
  it('roundtrips files through document adapter', () => {
    const files = [
      {
        path: 'notes/readme.md',
        content: 'hello',
        updatedAt: '2026-01-01T00:00:00.000Z',
        source: 'user',
        mimeType: 'text/markdown',
      },
      {
        path: 'src/main.ts',
        content: 'console.log(1);',
        source: 'assistant',
        mimeType: 'text/typescript',
      },
    ] as const;

    const document = workspaceFilesToDocument(files, {
      pageId: 'page-main',
      pageName: 'Main',
      version: '1.0.0',
    });

    const restored = documentNodesToWorkspaceFiles(document)
      .slice()
      .sort((left, right) => left.path.localeCompare(right.path));

    expect(document.pages).toHaveLength(1);
    expect(document.pages[0].nodes.some((node) => node.type === 'text')).toBe(true);
    expect(restored).toHaveLength(2);
    expect(restored).toEqual(
      [
        { ...files[0], path: 'notes/readme.md' },
        { ...files[1], path: 'src/main.ts' },
      ].sort((left, right) => left.path.localeCompare(right.path)),
    );
  });

  it('moves node via action-to-patch conversion', () => {
    const document = workspaceFilesToDocument([
      { path: 'a.txt', content: 'a' },
      { path: 'b.txt', content: 'b' },
      { path: 'c.txt', content: 'c' },
    ]);
    const patchResult = createPatchFromWorkbenchDocumentAction(
      {
        action: 'move',
        pageId: 'page-main',
        nodeId: 'node:c.txt',
        insertAfterId: 'node:a.txt',
      },
      document,
    );

    const next = applyWorkbenchDocumentPatch(document, patchResult.patch).document;
    const ordered = next.pages[0].nodes
      .filter((node) => node.type === 'text')
      .map((node) => node.id);
    expect(ordered).toEqual(['node:a.txt', 'node:c.txt', 'node:b.txt']);
  });
});
