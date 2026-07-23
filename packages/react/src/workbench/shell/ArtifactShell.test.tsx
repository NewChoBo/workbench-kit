import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  WorkbenchArtifactShell,
  formatWorkbenchArtifactContent,
  getWorkbenchArtifactExtension,
  getWorkbenchPreviewRenderer,
  selectWorkbenchPreviewRenderer,
  type WorkbenchArtifactDescriptor,
  type WorkbenchPreviewRenderer,
} from './ArtifactShell';

const markdownArtifact: WorkbenchArtifactDescriptor = {
  content: '# Summary',
  id: 'artifact.summary',
  mimeType: 'text/markdown',
  path: 'docs/summary.md',
};

const renderers: WorkbenchPreviewRenderer[] = [
  {
    extensions: ['md'],
    id: 'markdown-extension',
    priority: 1,
    render: () => <article>Markdown extension preview</article>,
  },
  {
    id: 'markdown-mime',
    mimeTypes: ['text/markdown'],
    priority: 1,
    render: () => <article>Markdown MIME preview</article>,
  },
  {
    artifactKinds: ['diagram'],
    id: 'diagram',
    render: () => <article>Diagram preview</article>,
  },
  {
    fallback: true,
    id: 'fallback',
    priority: 10,
    render: () => <article>Fallback preview</article>,
  },
];

describe('WorkbenchArtifactShell preview registry', () => {
  it('normalizes artifact extensions', () => {
    expect(getWorkbenchArtifactExtension(markdownArtifact)).toBe('md');
    expect(getWorkbenchArtifactExtension({ ...markdownArtifact, extension: '.JSON' })).toBe('json');
  });

  it('selects renderers by artifact kind, MIME type, extension, and fallback priority', () => {
    expect(
      selectWorkbenchPreviewRenderer({ ...markdownArtifact, artifactKind: 'diagram' }, renderers)
        ?.renderer.id,
    ).toBe('diagram');
    expect(selectWorkbenchPreviewRenderer(markdownArtifact, renderers)?.renderer.id).toBe(
      'markdown-mime',
    );
    expect(
      getWorkbenchPreviewRenderer(
        { content: '{}', id: 'config', mimeType: 'application/json', path: 'config.json' },
        renderers,
      )?.id,
    ).toBe('fallback');
  });

  it('allows custom renderer guards', () => {
    const guardedRenderer: WorkbenchPreviewRenderer = {
      canRender: (artifact) => artifact.metadata?.preview === true,
      id: 'guarded',
      render: () => <span>Guarded preview</span>,
    };

    expect(selectWorkbenchPreviewRenderer(markdownArtifact, [guardedRenderer])).toBeUndefined();
    expect(
      selectWorkbenchPreviewRenderer({ ...markdownArtifact, metadata: { preview: true } }, [
        guardedRenderer,
      ])?.reason,
    ).toBe('custom');
  });

  it('formats non-string content for the code pane', () => {
    expect(formatWorkbenchArtifactContent({ ok: true })).toBe('{\n  "ok": true\n}');
  });
});

describe('WorkbenchArtifactShell', () => {
  it('renders code mode by default', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchArtifactShell artifact={markdownArtifact} previewRenderers={renderers} />,
    );

    expect(markup).toContain('data-mode="code"');
    expect(markup).toContain('# Summary');
    expect(markup).not.toContain('Markdown MIME preview');
  });

  it('renders preview and split modes', () => {
    const previewMarkup = renderToStaticMarkup(
      <WorkbenchArtifactShell
        artifact={markdownArtifact}
        mode="preview"
        previewRenderers={renderers}
      />,
    );
    const splitMarkup = renderToStaticMarkup(
      <WorkbenchArtifactShell
        artifact={markdownArtifact}
        mode="split"
        previewRenderers={renderers}
      />,
    );

    expect(previewMarkup).toContain('data-mode="preview"');
    expect(previewMarkup).toContain('Markdown MIME preview');
    expect(splitMarkup).toContain('ui-workbench-split-view');
    expect(splitMarkup).toContain('# Summary');
    expect(splitMarkup).toContain('Markdown MIME preview');
  });

  it('renders an unsupported preview state', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchArtifactShell artifact={markdownArtifact} mode="preview" previewRenderers={[]} />,
    );

    expect(markup).toContain('Preview is not available for this artifact');
  });
});
