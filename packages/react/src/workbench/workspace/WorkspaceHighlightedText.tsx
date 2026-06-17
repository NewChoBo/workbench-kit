import { highlightText } from './search';

export interface WorkspaceHighlightedTextProps {
  query: string;
  text: string;
}

export function WorkspaceHighlightedText({ query, text }: WorkspaceHighlightedTextProps) {
  return (
    <>
      {highlightText(text, query).map((part, index) =>
        part.match ? (
          <mark key={`${part.text}-${index}`} className="workbench-search-mark">
            {part.text}
          </mark>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </>
  );
}
