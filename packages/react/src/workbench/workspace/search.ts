import type { WorkspaceFile, WorkspaceHighlightPart, WorkspaceSearchResult } from './types';

export function compactText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function lineNumberForIndex(content: string, index: number) {
  return content.slice(0, Math.max(index, 0)).split('\n').length;
}

export function createContentPreview(content: string, rawQuery: string) {
  const compact = compactText(content);
  const query = rawQuery.trim().toLowerCase();
  const matchIndex = query ? compact.toLowerCase().indexOf(query) : -1;
  if (matchIndex < 0) return compact.slice(0, 120);

  const start = Math.max(0, matchIndex - 48);
  const end = Math.min(compact.length, matchIndex + query.length + 72);
  return `${start > 0 ? '...' : ''}${compact.slice(start, end)}${end < compact.length ? '...' : ''}`;
}

export function highlightText(text: string, rawQuery: string): WorkspaceHighlightPart[] {
  const query = rawQuery.trim();
  if (!query) return [{ match: false, text }];

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: WorkspaceHighlightPart[] = [];
  let cursor = 0;
  let index = lowerText.indexOf(lowerQuery);

  while (index >= 0) {
    if (index > cursor) {
      parts.push({ match: false, text: text.slice(cursor, index) });
    }
    parts.push({ match: true, text: text.slice(index, index + query.length) });
    cursor = index + query.length;
    index = lowerText.indexOf(lowerQuery, cursor);
  }

  if (cursor < text.length) {
    parts.push({ match: false, text: text.slice(cursor) });
  }

  return parts;
}

export function searchWorkspaceFiles(
  files: WorkspaceFile[],
  rawQuery: string,
): WorkspaceSearchResult[] {
  const query = rawQuery.trim().toLowerCase();

  return files
    .flatMap((file) => {
      if (!query) {
        return [
          {
            file,
            id: file.path,
            line: 1,
            matchedBy: 'Content match' as const,
            path: file.path,
            preview: compactText(file.content).slice(0, 120),
          },
        ];
      }

      const pathMatchIndex = file.path.toLowerCase().indexOf(query);
      const contentMatchIndex = file.content.toLowerCase().indexOf(query);
      if (pathMatchIndex < 0 && contentMatchIndex < 0) return [];

      return [
        {
          file,
          id: file.path,
          line: contentMatchIndex >= 0 ? lineNumberForIndex(file.content, contentMatchIndex) : 1,
          matchedBy: pathMatchIndex >= 0 ? ('Path match' as const) : ('Content match' as const),
          path: file.path,
          preview:
            contentMatchIndex >= 0
              ? createContentPreview(file.content, rawQuery)
              : `Path includes "${rawQuery}"`,
        },
      ];
    })
    .sort((left, right) => {
      if (left.matchedBy !== right.matchedBy) {
        return left.matchedBy === 'Path match' ? -1 : 1;
      }
      return left.path.localeCompare(right.path);
    });
}
