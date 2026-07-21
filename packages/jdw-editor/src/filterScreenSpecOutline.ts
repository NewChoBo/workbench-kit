import type { ScreenNodePath, ScreenSpecOutlineEntry } from '@workbench-kit/jdw';

function pathKey(path: ScreenNodePath): string {
  return path.length === 0 ? 'root' : path.join('.');
}

function normalizedTokens(query: string): string[] {
  return query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
}

function entryMatches(entry: ScreenSpecOutlineEntry, tokens: readonly string[]): boolean {
  const haystack = `${entry.label} ${entry.node.kind}`.toLocaleLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

/**
 * Unreal Outliner-style search: keep matches and their ancestors so tree context remains.
 * Multi-term queries use AND (every token must match).
 */
export function filterScreenSpecOutline(
  outline: readonly ScreenSpecOutlineEntry[],
  query: string,
): readonly ScreenSpecOutlineEntry[] {
  const tokens = normalizedTokens(query);
  if (tokens.length === 0) {
    return outline;
  }

  const keep = new Set<string>();
  for (const entry of outline) {
    if (!entryMatches(entry, tokens)) {
      continue;
    }
    for (let depth = 0; depth <= entry.path.length; depth += 1) {
      keep.add(pathKey(entry.path.slice(0, depth)));
    }
  }

  return outline.filter((entry) => keep.has(pathKey(entry.path)));
}
