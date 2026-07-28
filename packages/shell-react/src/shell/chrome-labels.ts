/**
 * Host-overridable chrome strings for WorkbenchShell surfaces
 * (ActivityBar / StatusBar aria, secondary Profile/Settings, command palette,
 * Quick Open).
 *
 * Resolution order per string: `labels[key]` → `t(capabilityId, default)` → English default.
 * Kit does not ship locale packs — hosts inject `t` or partial `labels`.
 */

export type WorkbenchTranslate = (
  key: string,
  fallback: string,
  params?: Readonly<Record<string, string | number>>,
) => string;

/** Optional host i18n bag (same `t` signature as Field Remap chrome). */
export interface WorkbenchI18n {
  readonly t: WorkbenchTranslate;
}

export interface WorkbenchShellChromeLabels {
  readonly activityBarAriaLabel: string;
  readonly statusBarAriaLabel: string;
  readonly profileLabel: string;
  readonly profileTitle: string;
  readonly settingsLabel: string;
  readonly commandPaletteTitle: string;
  readonly commandPalettePlaceholder: string;
  readonly commandPaletteCloseLabel: string;
  readonly commandPaletteEmptyLabel: string;
  readonly quickOpenTitle: string;
  readonly quickOpenPlaceholder: string;
  readonly quickOpenCloseLabel: string;
  readonly quickOpenEmptyLabel: string;
}

export const defaultWorkbenchShellChromeLabels: WorkbenchShellChromeLabels = {
  activityBarAriaLabel: 'Activity bar',
  statusBarAriaLabel: 'Status bar',
  profileLabel: 'Profile',
  profileTitle: 'Open profile',
  settingsLabel: 'Settings',
  commandPaletteTitle: 'Command Palette',
  commandPalettePlaceholder: 'Search commands',
  commandPaletteCloseLabel: 'Close command palette',
  commandPaletteEmptyLabel: 'No commands match your search',
  quickOpenTitle: 'Quick Open',
  quickOpenPlaceholder: 'Search files by name',
  quickOpenCloseLabel: 'Close Quick Open',
  quickOpenEmptyLabel: 'No matching files',
};

/** Stable capability ids for optional `t()` injection (not free prose). */
export const workbenchShellChromeLabelKeys = {
  activityBarAriaLabel: 'shell.activityBar',
  statusBarAriaLabel: 'shell.statusBar',
  profileLabel: 'shell.profile',
  profileTitle: 'shell.profileTitle',
  settingsLabel: 'shell.settings',
  commandPaletteTitle: 'commandPalette.title',
  commandPalettePlaceholder: 'commandPalette.placeholder',
  commandPaletteCloseLabel: 'commandPalette.close',
  commandPaletteEmptyLabel: 'commandPalette.empty',
  quickOpenTitle: 'quickOpen.title',
  quickOpenPlaceholder: 'quickOpen.placeholder',
  quickOpenCloseLabel: 'quickOpen.close',
  quickOpenEmptyLabel: 'quickOpen.empty',
} as const satisfies Record<keyof WorkbenchShellChromeLabels, string>;

export function resolveWorkbenchShellChromeLabels(
  labels?: Partial<WorkbenchShellChromeLabels> | undefined,
  t?: WorkbenchTranslate | undefined,
): WorkbenchShellChromeLabels {
  const resolve = <K extends keyof WorkbenchShellChromeLabels>(key: K): string => {
    const override = labels?.[key];
    if (override !== undefined) {
      return override;
    }
    const fallback = defaultWorkbenchShellChromeLabels[key];
    return t?.(workbenchShellChromeLabelKeys[key], fallback) ?? fallback;
  };

  return {
    activityBarAriaLabel: resolve('activityBarAriaLabel'),
    statusBarAriaLabel: resolve('statusBarAriaLabel'),
    profileLabel: resolve('profileLabel'),
    profileTitle: resolve('profileTitle'),
    settingsLabel: resolve('settingsLabel'),
    commandPaletteTitle: resolve('commandPaletteTitle'),
    commandPalettePlaceholder: resolve('commandPalettePlaceholder'),
    commandPaletteCloseLabel: resolve('commandPaletteCloseLabel'),
    commandPaletteEmptyLabel: resolve('commandPaletteEmptyLabel'),
    quickOpenTitle: resolve('quickOpenTitle'),
    quickOpenPlaceholder: resolve('quickOpenPlaceholder'),
    quickOpenCloseLabel: resolve('quickOpenCloseLabel'),
    quickOpenEmptyLabel: resolve('quickOpenEmptyLabel'),
  };
}
