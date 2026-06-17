import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkbenchMarkdownPreview } from './MarkdownPreview';

describe('WorkbenchMarkdownPreview', () => {
  it('renders GitHub-style markdown content', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchMarkdownPreview
        source={[
          '# Release Notes',
          '',
          '- Markdown preview',
          '- Inline `code`',
          '',
          '> Quoted note',
        ].join('\n')}
      />,
    );

    expect(markup).toContain('ui-workbench-markdown-preview');
    expect(markup).toContain('<h1>Release Notes</h1>');
    expect(markup).toContain('<li>Markdown preview</li>');
    expect(markup).toContain('ui-workbench-markdown-preview__code');
    expect(markup).toContain('<blockquote>');
  });

  it('renders mermaid code fences as diagram previews', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchMarkdownPreview
        source={[
          '```mermaid',
          'graph TD',
          '  A[Start] --> B[Preview]',
          '  B --> C[Done]',
          '```',
        ].join('\n')}
      />,
    );

    expect(markup).toContain('data-testid="markdown-mermaid-preview"');
    expect(markup).toContain('Mermaid');
    expect(markup).toContain('graph');
    expect(markup).toContain('Start');
    expect(markup).toContain('Preview');
    expect(markup).toContain('Done');
  });
});
