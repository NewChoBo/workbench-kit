import type * as monaco from 'monaco-editor';

export const MONACO_DARK_THEME_ID = 'workbench-kit-dark';
export const MONACO_LIGHT_THEME_ID = 'workbench-kit-light';

export type MonacoWorkbenchResolvedTheme = 'dark' | 'light';

export interface WorkbenchThemeCssColors {
  accent: string;
  bg: string;
  border: string;
  danger: string;
  focusBorder: string;
  scrollbarThumb: string;
  scrollbarThumbActive: string;
  scrollbarThumbHover: string;
  surface: string;
  surfaceElevated: string;
  surfaceHover: string;
  text: string;
  textMuted: string;
  textSubtle: string;
}

function readCssVariable(root: HTMLElement, variableName: string): string {
  return getComputedStyle(root).getPropertyValue(variableName).trim();
}

export function readWorkbenchThemeColors(root: HTMLElement): WorkbenchThemeCssColors {
  return {
    accent: readCssVariable(root, '--color-accent'),
    bg: readCssVariable(root, '--color-bg'),
    border: readCssVariable(root, '--color-border'),
    danger: readCssVariable(root, '--color-danger'),
    focusBorder: readCssVariable(root, '--color-focus-border'),
    scrollbarThumb: readCssVariable(root, '--scrollbar-thumb'),
    scrollbarThumbActive: readCssVariable(root, '--scrollbar-thumb-active'),
    scrollbarThumbHover: readCssVariable(root, '--scrollbar-thumb-hover'),
    surface: readCssVariable(root, '--color-surface'),
    surfaceElevated: readCssVariable(root, '--color-surface-elevated'),
    surfaceHover: readCssVariable(root, '--color-surface-hover'),
    text: readCssVariable(root, '--color-text'),
    textMuted: readCssVariable(root, '--color-text-muted'),
    textSubtle: readCssVariable(root, '--color-text-subtle'),
  };
}

function parseRgbChannels(color: string): [number, number, number] | null {
  const normalized = color.trim();

  const hexMatch = normalized.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return [
        Number.parseInt(hex[0] + hex[0], 16),
        Number.parseInt(hex[1] + hex[1], 16),
        Number.parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (hex.length === 6 || hex.length === 8) {
      return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
      ];
    }
  }

  const rgbMatch = normalized.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+\s*)?\)$/i,
  );
  if (rgbMatch) {
    return [
      Math.round(Number(rgbMatch[1])),
      Math.round(Number(rgbMatch[2])),
      Math.round(Number(rgbMatch[3])),
    ];
  }

  return null;
}

export function withAlpha(color: string, alpha: number): string {
  const channels = parseRgbChannels(color);
  if (!channels) {
    return color;
  }

  const clampedAlpha = Math.min(1, Math.max(0, alpha));
  const alphaHex = Math.round(clampedAlpha * 255)
    .toString(16)
    .padStart(2, '0');
  const [red, green, blue] = channels;
  return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}${alphaHex}`;
}

export function buildMonacoThemeColors(colors: WorkbenchThemeCssColors): monaco.editor.IColors {
  return {
    'editor.background': colors.bg,
    'editor.foreground': colors.text,
    'editorGutter.background': colors.bg,
    'editorLineNumber.foreground': colors.textSubtle,
    'editorLineNumber.activeForeground': colors.textMuted,
    'editorCursor.foreground': colors.text,
    'editor.lineHighlightBackground': colors.surface,
    'editor.selectionBackground': withAlpha(colors.accent, 0.35),
    'editor.inactiveSelectionBackground': withAlpha(colors.accent, 0.22),
    'editorWidget.background': colors.surfaceElevated,
    'editorWidget.border': colors.border,
    'editorHoverWidget.background': colors.surfaceElevated,
    'editorHoverWidget.border': colors.border,
    'editorSuggestWidget.background': colors.surfaceElevated,
    'editorSuggestWidget.border': colors.border,
    focusBorder: colors.focusBorder,
    'input.background': colors.surfaceElevated,
    'input.border': colors.border,
    'minimap.background': colors.bg,
    'scrollbarSlider.background': colors.scrollbarThumb,
    'scrollbarSlider.hoverBackground': colors.scrollbarThumbHover,
    'scrollbarSlider.activeBackground': colors.scrollbarThumbActive,
    'editorIndentGuide.background1': colors.border,
    'editorIndentGuide.activeBackground1': colors.textMuted,
    'editorWhitespace.foreground': colors.border,
    'editorBracketMatch.background': colors.surfaceHover,
    'editorBracketMatch.border': colors.textMuted,
    'editorError.foreground': withAlpha(colors.danger, 0.7),
    'editorWarning.foreground': withAlpha(colors.textMuted, 0.7),
    'editorOverviewRuler.border': colors.bg,
    'editorOverviewRuler.errorForeground': withAlpha(colors.danger, 0.35),
    'editorOverviewRuler.warningForeground': withAlpha(colors.textMuted, 0.35),
  };
}

export function resolveMonacoThemeRoot(root?: HTMLElement): HTMLElement | null {
  if (root) {
    return root;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  return document.documentElement;
}

export function defineMonacoWorkbenchTheme(
  monacoInstance: typeof monaco,
  resolvedTheme: MonacoWorkbenchResolvedTheme,
  root?: HTMLElement,
) {
  const themeRoot = resolveMonacoThemeRoot(root);
  if (!themeRoot) {
    return;
  }

  const themeId = resolvedTheme === 'light' ? MONACO_LIGHT_THEME_ID : MONACO_DARK_THEME_ID;

  monacoInstance.editor.defineTheme(themeId, {
    base: resolvedTheme === 'light' ? 'vs' : 'vs-dark',
    inherit: true,
    rules: [],
    colors: buildMonacoThemeColors(readWorkbenchThemeColors(themeRoot)),
  });
}

export function monacoThemeForWorkspaceTheme(theme: MonacoWorkbenchResolvedTheme) {
  return theme === 'light' ? MONACO_LIGHT_THEME_ID : MONACO_DARK_THEME_ID;
}

export function getWorkbenchThemeAppearanceSignature(root?: HTMLElement): string {
  const themeRoot = resolveMonacoThemeRoot(root);
  if (!themeRoot) {
    return '';
  }

  return `${themeRoot.dataset.theme ?? ''}:${themeRoot.dataset.themePreset ?? ''}`;
}
