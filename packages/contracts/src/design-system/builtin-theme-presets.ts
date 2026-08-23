export interface WorkbenchThemePresetManifestEntry<TId extends string = string> {
  readonly id: TId;
  readonly label: string;
}

/** Framework-neutral manifest for every built-in light color preset. */
export const LIGHT_THEME_PRESET_MANIFEST = [
  { id: 'orange', label: 'Light Orange' },
  { id: 'skyblue', label: 'Sky Blue' },
  { id: 'light-plus', label: 'Light+' },
] as const satisfies readonly WorkbenchThemePresetManifestEntry[];

/** Framework-neutral manifest for every built-in dark color preset. */
export const DARK_THEME_PRESET_MANIFEST = [
  { id: 'navy', label: 'Deep Navy' },
  { id: 'purple', label: 'Purple' },
  { id: 'modern', label: 'Modern Dark' },
  { id: 'dark-plus', label: 'Dark+' },
  { id: 'hc-black', label: 'High Contrast Black' },
  { id: 'slate', label: 'Slate (alias pack)' },
] as const satisfies readonly WorkbenchThemePresetManifestEntry[];

export type LightThemePresetId = (typeof LIGHT_THEME_PRESET_MANIFEST)[number]['id'];
export type DarkThemePresetId = (typeof DARK_THEME_PRESET_MANIFEST)[number]['id'];
export type ThemePresetId = LightThemePresetId | DarkThemePresetId;

export const DEFAULT_LIGHT_THEME_PRESET: LightThemePresetId = 'skyblue';
export const DEFAULT_DARK_THEME_PRESET: DarkThemePresetId = 'purple';

export type WorkbenchColorSchemePreference = 'system' | 'light' | 'dark';

export interface WorkbenchThemePresetOption<TId extends string = string> {
  readonly id: TId;
  readonly label: string;
}

export const WORKBENCH_COLOR_SCHEME_OPTIONS = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
] as const satisfies readonly WorkbenchThemePresetOption<WorkbenchColorSchemePreference>[];

export const LIGHT_THEME_PRESET_OPTIONS = LIGHT_THEME_PRESET_MANIFEST.map((entry) => ({
  id: entry.id,
  label: entry.label,
})) satisfies WorkbenchThemePresetOption<LightThemePresetId>[];

export const DARK_THEME_PRESET_OPTIONS = DARK_THEME_PRESET_MANIFEST.map((entry) => ({
  id: entry.id,
  label: entry.label,
})) satisfies WorkbenchThemePresetOption<DarkThemePresetId>[];

const LIGHT_THEME_PRESET_IDS = new Set<string>(
  LIGHT_THEME_PRESET_MANIFEST.map((entry) => entry.id),
);
const DARK_THEME_PRESET_IDS = new Set<string>(DARK_THEME_PRESET_MANIFEST.map((entry) => entry.id));

export function isLightThemePresetId(
  value: string | null | undefined,
): value is LightThemePresetId {
  return value != null && LIGHT_THEME_PRESET_IDS.has(value);
}

export function isDarkThemePresetId(value: string | null | undefined): value is DarkThemePresetId {
  return value != null && DARK_THEME_PRESET_IDS.has(value);
}
