import { resolveWorkbenchTheme, type ResolvedWorkbenchTheme } from './theme';
import type { WorkbenchTheme } from './standalone';

export interface WorkbenchThemePresetManifestEntry<TId extends string = string> {
  readonly id: TId;
  readonly label: string;
}

/** One manifest entry per CSS preset file under `@workbench-kit/tokens/src/themes/`. */
export const LIGHT_THEME_PRESET_MANIFEST = [
  { id: 'orange', label: 'Light Orange' },
  { id: 'skyblue', label: 'Sky Blue' },
  { id: 'light-plus', label: 'Light+' },
] as const satisfies readonly WorkbenchThemePresetManifestEntry[];

export const DARK_THEME_PRESET_MANIFEST = [
  { id: 'navy', label: 'Deep Navy' },
  { id: 'purple', label: 'Purple' },
  { id: 'modern', label: 'Modern Dark' },
  { id: 'dark-plus', label: 'Dark+' },
  { id: 'hc-black', label: 'High Contrast Black' },
] as const satisfies readonly WorkbenchThemePresetManifestEntry[];

export type LightThemePresetId = (typeof LIGHT_THEME_PRESET_MANIFEST)[number]['id'];
export type DarkThemePresetId = (typeof DARK_THEME_PRESET_MANIFEST)[number]['id'];
export type ThemePresetId = LightThemePresetId | DarkThemePresetId;

export const DEFAULT_LIGHT_THEME_PRESET: LightThemePresetId = 'skyblue';
export const DEFAULT_DARK_THEME_PRESET: DarkThemePresetId = 'purple';

export type WorkbenchColorSchemePreference = 'system' | WorkbenchTheme;

export const WORKBENCH_COLOR_SCHEME_OPTIONS: WorkbenchThemePresetOption<WorkbenchColorSchemePreference>[] =
  [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ];

export interface WorkbenchThemePresetOption<TId extends string = string> {
  id: TId;
  label: string;
}

export const LIGHT_THEME_PRESET_OPTIONS: WorkbenchThemePresetOption<LightThemePresetId>[] =
  LIGHT_THEME_PRESET_MANIFEST.map((entry) => ({ id: entry.id, label: entry.label }));

export const DARK_THEME_PRESET_OPTIONS: WorkbenchThemePresetOption<DarkThemePresetId>[] =
  DARK_THEME_PRESET_MANIFEST.map((entry) => ({ id: entry.id, label: entry.label }));

const LIGHT_THEME_PRESET_IDS = new Set<string>(
  LIGHT_THEME_PRESET_MANIFEST.map((entry) => entry.id),
);
const DARK_THEME_PRESET_IDS = new Set<string>(DARK_THEME_PRESET_MANIFEST.map((entry) => entry.id));

export interface WorkbenchThemePresetSelection {
  /** A built-in preset id, or a contributed theme id with a matching `mode`. */
  lightPreset: string;
  darkPreset: string;
}

export function isLightThemePresetId(
  value: string | null | undefined,
): value is LightThemePresetId {
  return value != null && LIGHT_THEME_PRESET_IDS.has(value);
}

export function isDarkThemePresetId(value: string | null | undefined): value is DarkThemePresetId {
  return value != null && DARK_THEME_PRESET_IDS.has(value);
}

export function resolveActiveThemePreset(
  resolvedTheme: ResolvedWorkbenchTheme,
  selection: WorkbenchThemePresetSelection,
): string {
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

export interface WorkbenchAppearanceSettings {
  darkPreset: string;
  lightPreset: string;
  themePreference: WorkbenchColorSchemePreference;
}

/**
 * Applies color scheme preference and light/dark presets to a DOM root (typically `document.documentElement`).
 * Returns the resolved attributes so callers can derive the active preset id without
 * recomputing `resolveWorkbenchTheme` themselves.
 */
export function applyWorkbenchAppearance(
  root: HTMLElement,
  settings: WorkbenchAppearanceSettings,
): WorkbenchThemeDocumentAttributes {
  const attributes: WorkbenchThemeDocumentAttributes = {
    darkPreset: settings.darkPreset,
    lightPreset: settings.lightPreset,
    resolvedTheme: resolveWorkbenchTheme(settings.themePreference),
    themePreference: settings.themePreference,
  };

  applyWorkbenchThemeAttributes(root, attributes);

  return attributes;
}
