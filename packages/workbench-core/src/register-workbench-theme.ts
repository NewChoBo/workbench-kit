import { toDisposable, type Disposable } from '@workbench-kit/base';

import type { ThemeRegistry, WorkbenchThemeContribution } from './theme-registry.js';

/** Extension id used for host-registered themes (bootstrap API, not extension manifest). */
export const HOST_WORKBENCH_THEME_EXTENSION_ID = 'workbench-kit.host';

export type WorkbenchHostThemeMode = 'dark' | 'light';

export interface WorkbenchHostThemeRegistration {
  readonly id: string;
  readonly label: string;
  readonly mode: WorkbenchHostThemeMode;
  readonly tokenOverrides: Readonly<Record<string, string>>;
}

export interface RegisterWorkbenchThemeOptions {
  readonly label: string;
  readonly mode: WorkbenchHostThemeMode;
}

/**
 * Builds a host theme registration for kit bootstrap (e.g. `WorkbenchProvider` `hostThemes`).
 */
export function createWorkbenchHostThemeRegistration(
  id: string,
  tokenOverrides: Readonly<Record<string, string>>,
  options: RegisterWorkbenchThemeOptions,
): WorkbenchHostThemeRegistration {
  return {
    id,
    label: options.label,
    mode: options.mode,
    tokenOverrides,
  };
}

/**
 * Registers a contributed theme on the kit theme registry during host bootstrap.
 * Token overrides must include the full required token set (see `REQUIRED_THEME_TOKEN_KEYS`).
 */
export function registerWorkbenchTheme(
  themeRegistry: ThemeRegistry,
  id: string,
  tokenOverrides: Readonly<Record<string, string>>,
  options: RegisterWorkbenchThemeOptions,
): Disposable {
  return themeRegistry.registerTheme(toWorkbenchThemeContribution(id, tokenOverrides, options));
}

export function registerHostWorkbenchThemes(
  themeRegistry: ThemeRegistry,
  themes: readonly WorkbenchHostThemeRegistration[],
): Disposable {
  const disposables = themes.map((theme) =>
    registerWorkbenchTheme(themeRegistry, theme.id, theme.tokenOverrides, {
      label: theme.label,
      mode: theme.mode,
    }),
  );

  return toDisposable(() => {
    for (const disposable of disposables) {
      disposable.dispose();
    }
  });
}

function toWorkbenchThemeContribution(
  id: string,
  tokenOverrides: Readonly<Record<string, string>>,
  options: RegisterWorkbenchThemeOptions,
): WorkbenchThemeContribution {
  return {
    extensionId: HOST_WORKBENCH_THEME_EXTENSION_ID,
    id,
    label: options.label,
    mode: options.mode,
    tokenOverrides,
  };
}
