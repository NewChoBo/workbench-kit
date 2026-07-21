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

  it('renders GFM tables and task lists via remark-gfm', () => {
    const markup = renderToStaticMarkup(
      <WorkbenchMarkdownPreview
        source={[
          '| Column | Value |',
          '| ------ | ----- |',
          '| Status | Ready |',
          '',
          '- [x] Done',
          '- [ ] Todo',
        ].join('\n')}
      />,
    );

    expect(markup).toContain('<table>');
    expect(markup).toContain('<th>Column</th>');
    expect(markup).toContain('<td>Ready</td>');
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain('checked=""');
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
