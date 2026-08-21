import {
  DARK_THEME_PRESET_OPTIONS,
  LIGHT_THEME_PRESET_OPTIONS,
  WORKBENCH_COLOR_SCHEME_OPTIONS,
} from '@workbench-kit/react/workbench';
import type { ThemeRegistry } from '@workbench-kit/workbench-core';

interface ThemeOptionLike {
  readonly id: string;
}

export type ThemeSelectionProtectionSnapshot =
  | {
      readonly kind: 'known';
      readonly protectedThemeIds: readonly string[];
      readonly themeRegistryRevision: number;
    }
  | {
      readonly kind: 'unknown';
      readonly themeRegistryRevision: number;
    };

export interface ThemeSelectionProtectionInput {
  readonly darkPreset: string | undefined;
  readonly lightPreset: string | undefined;
  readonly theme: string | undefined;
  readonly themeOptions: readonly ThemeOptionLike[] | undefined;
  readonly themes: ThemeRegistry;
}

/**
 * Captures only selections that resolve to exactly one current option source.
 * Unknown values deliberately do not resolve to the first rendered option: the
 * soft lifecycle must fail closed instead of guessing which fallback is active.
 */
export function createThemeSelectionProtectionSnapshot({
  darkPreset,
  lightPreset,
  theme,
  themeOptions,
  themes,
}: ThemeSelectionProtectionInput): ThemeSelectionProtectionSnapshot {
  const themeRegistryRevision = themes.getRevision();
  const contributedThemes = themes.getThemes();
  const hasLightPreset = lightPreset !== undefined;
  const hasDarkPreset = darkPreset !== undefined;

  if (hasLightPreset !== hasDarkPreset) {
    return { kind: 'unknown', themeRegistryRevision };
  }

  if (hasLightPreset && hasDarkPreset) {
    const lightOptions = [
      ...LIGHT_THEME_PRESET_OPTIONS,
      ...contributedThemes.filter((candidate) => candidate.mode === 'light'),
    ];
    const darkOptions = [
      ...DARK_THEME_PRESET_OPTIONS,
      ...contributedThemes.filter((candidate) => candidate.mode === 'dark'),
    ];

    if (
      !hasExactlyOneOption(theme, WORKBENCH_COLOR_SCHEME_OPTIONS) ||
      !hasExactlyOneOption(lightPreset, lightOptions) ||
      !hasExactlyOneOption(darkPreset, darkOptions)
    ) {
      return { kind: 'unknown', themeRegistryRevision };
    }

    return {
      kind: 'known',
      protectedThemeIds: [theme, lightPreset, darkPreset],
      themeRegistryRevision,
    };
  }

  const themeSources = [...(themeOptions ?? []), ...contributedThemes];
  if (!hasExactlyOneOption(theme, themeSources)) {
    return { kind: 'unknown', themeRegistryRevision };
  }

  return {
    kind: 'known',
    protectedThemeIds: [theme],
    themeRegistryRevision,
  };
}

function hasExactlyOneOption(
  selection: string | undefined,
  options: readonly ThemeOptionLike[],
): selection is string {
  if (!selection) {
    return false;
  }

  return options.filter((option) => option.id === selection).length === 1;
}
