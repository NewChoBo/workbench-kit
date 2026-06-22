import type { ResolvedWorkbenchTheme } from './theme';

export type LightThemePresetId = 'orange' | 'skyblue';
export type DarkThemePresetId = 'navy' | 'purple' | 'modern';
export type ThemePresetId = LightThemePresetId | DarkThemePresetId;

export const DEFAULT_LIGHT_THEME_PRESET: LightThemePresetId = 'skyblue';
export const DEFAULT_DARK_THEME_PRESET: DarkThemePresetId = 'purple';

export interface WorkbenchThemePresetOption<TId extends string = string> {
  id: TId;
  label: string;
}

export const LIGHT_THEME_PRESET_OPTIONS: WorkbenchThemePresetOption<LightThemePresetId>[] = [
  { id: 'orange', label: 'Light Orange' },
  { id: 'skyblue', label: 'Sky Blue' },
];

export const DARK_THEME_PRESET_OPTIONS: WorkbenchThemePresetOption<DarkThemePresetId>[] = [
  { id: 'navy', label: 'Deep Navy' },
  { id: 'purple', label: 'Purple' },
  { id: 'modern', label: 'Modern Dark' },
];

export interface WorkbenchThemePresetSelection {
  lightPreset: LightThemePresetId;
  darkPreset: DarkThemePresetId;
}

export function isLightThemePresetId(
  value: string | null | undefined,
): value is LightThemePresetId {
  return value === 'orange' || value === 'skyblue';
}

export function isDarkThemePresetId(value: string | null | undefined): value is DarkThemePresetId {
  return value === 'navy' || value === 'purple' || value === 'modern';
}

export function resolveActiveThemePreset(
  resolvedTheme: ResolvedWorkbenchTheme,
  selection: WorkbenchThemePresetSelection,
): ThemePresetId {
  return resolvedTheme === 'light' ? selection.lightPreset : selection.darkPreset;
}

export interface WorkbenchThemeDocumentAttributes extends WorkbenchThemePresetSelection {
  resolvedTheme: ResolvedWorkbenchTheme;
  themePreference?: string | undefined;
}

/**
 * Applies resolved theme mode and active preset to a DOM root (typically `document.documentElement`).
 */
export function applyWorkbenchThemeAttributes(
  root: HTMLElement,
  attributes: WorkbenchThemeDocumentAttributes,
): void {
  root.dataset.theme = attributes.resolvedTheme;

  if (attributes.themePreference === undefined) {
    delete root.dataset.themePreference;
  } else {
    root.dataset.themePreference = attributes.themePreference;
  }

  root.dataset.themePreset = resolveActiveThemePreset(attributes.resolvedTheme, attributes);
}
