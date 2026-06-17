import Markdown from 'react-markdown';
import { Children, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface WorkbenchMarkdownPreviewProps extends ComponentPropsWithoutRef<'article'> {
  source: string;
}

export function WorkbenchMarkdownPreview({
  className,
  source,
  ...props
}: WorkbenchMarkdownPreviewProps) {
  return (
    <article className={cx('ui-workbench-markdown-preview', className)} {...props}>
      <Markdown
        components={{
          a: ({ children, href, ...anchorProps }) => (
            <a
              href={href}
              rel="noreferrer"
              target={href?.startsWith('#') ? undefined : '_blank'}
              {...anchorProps}
            >
              {children}
            </a>
          ),
          code: ({ className: codeClassName, ...codeProps }) => (
            <code
              className={cx('ui-workbench-markdown-preview__code', codeClassName)}
              {...codeProps}
            />
          ),
          pre: ({ children }) => {
            const codeBlock = getMarkdownCodeBlock(children);

            if (codeBlock?.language === 'mermaid') {
              return <WorkbenchMermaidPreview source={codeBlock.source} />;
            }

            return <pre>{children}</pre>;
          },
        }}
      >
        {source}
      </Markdown>
    </article>
  );
}

function WorkbenchMermaidPreview({ source }: { source: string }) {
  const summary = summarizeMermaidSource(source);

  return (
    <figure
      className="ui-workbench-markdown-preview__mermaid"
      data-testid="markdown-mermaid-preview"
    >
      <figcaption className="ui-workbench-markdown-preview__mermaid-header">
        <span className="ui-workbench-markdown-preview__mermaid-title">
          <i aria-hidden className="codicon codicon-git-branch" />
          Mermaid
        </span>
        <span className="ui-workbench-markdown-preview__mermaid-kind">{summary.kind}</span>
      </figcaption>
      <div
        className="ui-workbench-markdown-preview__mermaid-canvas"
        aria-label="Mermaid diagram preview"
      >
        {summary.nodes.length > 0 ? (
          <div className="ui-workbench-markdown-preview__mermaid-flow">
            {summary.nodes.map((node, index) => (
              <span
                key={`${node}-${index}`}
                className="ui-workbench-markdown-preview__mermaid-node"
              >
                {node}
              </span>
            ))}
          </div>
        ) : (
          <pre className="ui-workbench-markdown-preview__mermaid-source">{source.trim()}</pre>
        )}
      </div>
    </figure>
  );
}

function getMarkdownCodeBlock(children: ReactNode): { language: string; source: string } | null {
  const [child] = Children.toArray(children);
  if (!isValidElement<{ className?: string | undefined; children?: ReactNode }>(child)) {
    return null;
  }

  const className = child.props.className;
  if (typeof className !== 'string') {
    return null;
  }

  const languageMatch = /\blanguage-([a-z0-9_-]+)\b/i.exec(className);
  if (!languageMatch) {
    return null;
  }

  return {
    language: languageMatch[1]?.toLowerCase() ?? '',
    source: extractTextContent(child.props.children).replace(/\n$/, ''),
  };
}

function extractTextContent(value: ReactNode): string {
  return Children.toArray(value)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child);
      }

      if (isValidElement<{ children?: ReactNode }>(child)) {
        return extractTextContent(child.props.children);
      }

      return '';
    })
    .join('');
}

function summarizeMermaidSource(source: string): { kind: string; nodes: string[] } {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const declaration = lines[0] ?? 'mermaid';
  const kind = declaration.split(/\s+/)[0] ?? 'mermaid';
  const nodes = lines
    .slice(1)
    .flatMap((line) => line.split(/-->|---|==>|-.->|->/))
    .map((segment) => cleanMermaidNodeLabel(segment))
    .filter((segment) => segment.length > 0)
    .filter((segment, index, all) => all.indexOf(segment) === index)
    .slice(0, 6);

  return { kind, nodes };
}

function cleanMermaidNodeLabel(value: string): string {
  return value
    .replace(/^[A-Za-z0-9_]+(?=\[|\(|\{)/, '')
    .replace(/^[A-Za-z0-9_]+$/, '')
    .replace(/[[\]{}()"]/g, '')
    .trim();
}
