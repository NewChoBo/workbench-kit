import { searchWorkspaceFiles, type WorkspaceFile } from '@workbench-kit/workspace';

import type { QuickOpenItem, QuickOpenProvider } from './quick-open-model';

export const WORKSPACE_FILES_QUICK_OPEN_PROVIDER_ID = 'workspace.files' as const;

export interface CreateWorkspaceFilesQuickOpenProviderOptions {
  /** Current workspace files, or a getter read on each search. */
  files: readonly WorkspaceFile[] | (() => readonly WorkspaceFile[]);
  id?: string | undefined;
  label?: string | undefined;
  /**
   * When the query is empty, these paths appear first (still present in `files`).
   * Remaining files follow in `searchWorkspaceFiles` order.
   */
  recentPaths?: readonly string[] | undefined;
}

function resolveFiles(
  files: CreateWorkspaceFilesQuickOpenProviderOptions['files'],
): readonly WorkspaceFile[] {
  return typeof files === 'function' ? files() : files;
}

function toQuickOpenItem(
  path: string,
  matchedBy?: string,
  preview?: string,
): QuickOpenItem {
  const segments = path.split('/');
  const label = segments[segments.length - 1] || path;
  const parent = segments.length > 1 ? segments.slice(0, -1).join('/') : undefined;

  return {
    data: { path },
    description: parent,
    detail: matchedBy ?? preview,
    icon: 'codicon-file',
    id: path,
    label,
  };
}

export function createWorkspaceFilesQuickOpenProvider(
  options: CreateWorkspaceFilesQuickOpenProviderOptions,
): QuickOpenProvider {
  const providerId = options.id ?? WORKSPACE_FILES_QUICK_OPEN_PROVIDER_ID;
  const providerLabel = options.label ?? 'Files';

  return {
    id: providerId,
    label: providerLabel,
    search(query: string) {
      const files = [...resolveFiles(options.files)];
      const results = searchWorkspaceFiles(files, query);
      const items = results.map((result) =>
        toQuickOpenItem(result.path, result.matchedBy, result.preview),
      );

      if (query.trim() || !options.recentPaths?.length) {
        return items;
      }

      const recentSet = new Set(options.recentPaths);
      const byPath = new Map(items.map((item) => [item.id, item]));
      const recentItems: QuickOpenItem[] = [];

      for (const path of options.recentPaths) {
        const item = byPath.get(path);
        if (item) {
          recentItems.push({ ...item, detail: 'Recent' });
        }
      }

      const rest = items.filter((item) => !recentSet.has(item.id));
      return [...recentItems, ...rest];
    },
  };
}

export function resolveQuickOpenItemPath(item: QuickOpenItem): string | undefined {
  if (typeof item.data === 'object' && item.data !== null && 'path' in item.data) {
    const path = (item.data as { path?: unknown }).path;
    if (typeof path === 'string' && path.length > 0) {
      return path;
    }
  }

  return item.id || undefined;
}
