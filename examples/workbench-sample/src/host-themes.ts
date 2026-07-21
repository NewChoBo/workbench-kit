import {
  createWorkbenchHostThemeRegistration,
  REQUIRED_THEME_TOKEN_KEYS,
} from '@workbench-kit/workbench-core';

function buildHostThemeTokens(values: {
  bg: string;
  sidebar: string;
  surface: string;
  border: string;
  text: string;
  accent: string;
}): Record<string, string> {
  return {
    '--color-bg': values.bg,
    '--color-bg-75': `${values.bg}bf`,
    '--color-primary-side-bar-bg': values.sidebar,
    '--color-primary-side-bar-bg-75': `${values.sidebar}bf`,
    '--color-surface': values.surface,
    '--color-surface-hover': values.surface,
    '--color-surface-elevated': values.surface,
    '--color-border': values.border,
    '--color-text': values.text,
    '--color-text-muted': values.text,
    '--color-text-subtle': values.text,
    '--color-accent': values.accent,
    '--color-accent-hover': values.accent,
    '--color-accent-foreground': '#ffffff',
    '--color-focus-border': values.accent,
    '--color-danger': '#f87171',
    '--color-danger-hover': '#fca5a5',
    '--scrollbar-thumb': `${values.border}66`,
    '--scrollbar-thumb-hover': `${values.border}88`,
    '--scrollbar-thumb-active': `${values.border}aa`,
  };
}

function assertCompleteHostThemeTokens(tokens: Record<string, string>): Record<string, string> {
  for (const key of REQUIRED_THEME_TOKEN_KEYS) {
    if (!(key in tokens)) {
      throw new Error(`Sample host theme is missing required token: ${key}`);
    }
  }

  return tokens;
}

/** Host-registered theme demonstrating `registerWorkbenchTheme` / `hostThemes` bootstrap wiring. */
export const sampleHostThemes = [
  createWorkbenchHostThemeRegistration(
    'workbench-kit.sample.host.forest',
    assertCompleteHostThemeTokens(
      buildHostThemeTokens({
        accent: '#4ade80',
        bg: '#0f1a12',
        border: '#1f3d2a',
        sidebar: '#0b140d',
        surface: '#173322',
        text: '#e8f5e9',
      }),
    ),
    {
      label: 'Sample Forest',
      mode: 'dark',
    },
  ),
] as const;
