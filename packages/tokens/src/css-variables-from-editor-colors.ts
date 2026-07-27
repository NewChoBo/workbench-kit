/**
 * Maps a documented subset of VS Code-compatible theme `colors` keys to
 * Workbench Kit CSS variables. Pure function — does not mutate the DOM.
 *
 * Unknown keys are ignored. Invalid color values are skipped.
 */

export interface CssVariablesFromEditorColorsOptions {
  /** CSS custom-property prefix. Defaults to `--`. */
  readonly prefix?: string;
  /** Optional warn callback for unknown keys (never throws). */
  readonly onUnknownKey?: (key: string) => void;
}

/** Documented editor color key → kit token name (without `--` prefix characters). */
export const EDITOR_COLOR_TO_KIT_TOKEN = {
  'editor.background': 'color-bg',
  'sideBar.background': 'color-primary-side-bar-bg',
  'panel.background': 'color-surface',
  'list.hoverBackground': 'color-surface-hover',
  'sideBar.border': 'color-border',
  'panel.border': 'color-border',
  'editor.foreground': 'color-text',
  foreground: 'color-text',
  descriptionForeground: 'color-text-muted',
  'button.background': 'color-accent',
  'button.hoverBackground': 'color-accent-hover',
  focusBorder: 'color-focus-border',
  errorForeground: 'color-danger',
} as const satisfies Readonly<Record<string, string>>;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR = /^rgba?\(/i;
const HSL_COLOR = /^hsla?\(/i;
const VAR_COLOR = /^var\(/i;

function isValidCssColor(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return (
    HEX_COLOR.test(trimmed) ||
    RGB_COLOR.test(trimmed) ||
    HSL_COLOR.test(trimmed) ||
    VAR_COLOR.test(trimmed)
  );
}

/**
 * Convert editor theme `colors` JSON into kit CSS variable declarations.
 *
 * @returns Record keyed by CSS custom properties (e.g. `--color-bg`).
 */
export function cssVariablesFromEditorColors(
  colors: Readonly<Record<string, string>>,
  options: CssVariablesFromEditorColorsOptions = {},
): Record<string, string> {
  const prefix = options.prefix ?? '--';
  const result: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(colors)) {
    const token = EDITOR_COLOR_TO_KIT_TOKEN[key as keyof typeof EDITOR_COLOR_TO_KIT_TOKEN];
    if (token === undefined) {
      options.onUnknownKey?.(key);
      continue;
    }

    if (typeof rawValue !== 'string' || !isValidCssColor(rawValue)) {
      continue;
    }

    result[`${prefix}${token}`] = rawValue.trim();
  }

  return result;
}
