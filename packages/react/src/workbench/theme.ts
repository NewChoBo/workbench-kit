import { useSyncExternalStore } from 'react';
import type { WorkbenchTheme } from './standalone';

export type ResolvedWorkbenchTheme = 'dark' | 'light';

const LIGHT_QUERY = '(prefers-color-scheme: light)';

function getSystemTheme(): ResolvedWorkbenchTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark';
}

function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const mediaQuery = window.matchMedia(LIGHT_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getServerSystemTheme(): ResolvedWorkbenchTheme {
  return 'dark';
}

/**
 * Resolves a theme preference (including 'system') to an actual 'light' | 'dark' theme.
 * For custom theme strings, returns them unchanged (cast to ResolvedWorkbenchTheme).
 */
export function useResolvedWorkbenchTheme(
  theme: WorkbenchTheme | 'system',
): ResolvedWorkbenchTheme {
  const systemTheme = useSyncExternalStore<ResolvedWorkbenchTheme>(
    subscribeToSystemTheme,
    getSystemTheme,
    getServerSystemTheme,
  );

  if (theme === 'system') return systemTheme;
  return theme as unknown as ResolvedWorkbenchTheme;
}

export function resolveWorkbenchTheme(theme: WorkbenchTheme | 'system'): ResolvedWorkbenchTheme {
  if (theme === 'system') return getSystemTheme();
  return theme as unknown as ResolvedWorkbenchTheme;
}
