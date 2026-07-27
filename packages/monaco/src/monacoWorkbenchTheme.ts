import type * as monaco from 'monaco-editor';

export const MONACO_DARK_THEME_ID = 'workbench-kit-dark';
export const MONACO_LIGHT_THEME_ID = 'workbench-kit-light';

export type MonacoWorkbenchResolvedTheme = 'dark' | 'light';

export type MonacoWorkbenchThemeBase = 'vs' | 'vs-dark' | 'hc-black';

/** Monaco `editor.defineTheme` token rule (syntax highlighting). */
export interface MonacoTokenRule {
  readonly token: string;
  readonly foreground?: string;
  readonly background?: string;
  readonly fontStyle?: string;
}

/**
 * VS Code–compatible `tokenColors` entry (TextMate scope settings).
 * Hosts may pass theme JSON `tokenColors` through `monacoRulesFromTokenColors`.
 */
export interface WorkbenchTokenColorSetting {
  readonly scope?: string | readonly string[];
  readonly settings?: {
    readonly foreground?: string;
    readonly background?: string;
    readonly fontStyle?: string;
  };
}

export interface WorkbenchMonacoThemeInput {
  readonly base: MonacoWorkbenchThemeBase;
  readonly colors?: Readonly<Record<string, string>>;
  readonly rules?: readonly MonacoTokenRule[];
}

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

/** Optional host-provided syntax rules merged on every workbench theme define. */
let activeHostTokenRules: readonly MonacoTokenRule[] | undefined;

export function setWorkbenchMonacoTokenRules(rules: readonly MonacoTokenRule[] | undefined): void {
  activeHostTokenRules = rules;
}

export function getWorkbenchMonacoTokenRules(): readonly MonacoTokenRule[] | undefined {
  return activeHostTokenRules;
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

/**
 * Monaco token `foreground` / `background` values omit `#`.
 * Invalid or empty colors are skipped by callers.
 */
export function toMonacoTokenColor(color: string | undefined): string | undefined {
  if (!color) {
    return undefined;
  }
  const trimmed = color.trim();
  if (!trimmed) {
    return undefined;
  }
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  // Drop alpha channel when present (#RRGGBBAA → RRGGBB) for token rules.
  if (/^[0-9a-fA-F]{8}$/.test(withoutHash)) {
    return withoutHash.slice(0, 6);
  }
  if (/^[0-9a-fA-F]{6}$/.test(withoutHash) || /^[0-9a-fA-F]{3}$/.test(withoutHash)) {
    return withoutHash;
  }
  // Non-hex (rgb/hsl/var) — Monaco rules require hex; skip safely.
  return undefined;
}

/**
 * Default syntax rules derived from chrome CSS tokens so built-in Monaco
 * languages track the active workbench palette. Hosts that load TextMate /
 * grammar packs should supply richer rules via `setWorkbenchMonacoTokenRules`
 * or `defineOrUpdateWorkbenchMonacoTheme`.
 */
export function buildDefaultMonacoTokenRules(colors: WorkbenchThemeCssColors): MonacoTokenRule[] {
  const text = toMonacoTokenColor(colors.text);
  const muted = toMonacoTokenColor(colors.textMuted);
  const subtle = toMonacoTokenColor(colors.textSubtle);
  const accent = toMonacoTokenColor(colors.accent);
  const danger = toMonacoTokenColor(colors.danger);

  const rules: MonacoTokenRule[] = [];
  const push = (token: string, foreground: string | undefined, fontStyle?: string) => {
    if (!foreground) {
      return;
    }
    rules.push(fontStyle ? { token, foreground, fontStyle } : { token, foreground });
  };

  push('comment', subtle, 'italic');
  push('string', accent);
  push('string.escape', muted);
  push('keyword', accent);
  push('keyword.flow', accent);
  push('number', danger);
  push('regexp', danger);
  push('type', accent);
  push('class', accent);
  push('function', text);
  push('variable', text);
  push('variable.predefined', muted);
  push('constant', muted);
  push('delimiter', muted);
  push('delimiter.html', muted);
  push('tag', accent);
  push('metatag', muted);
  push('attribute.name', muted);
  push('attribute.value', accent);
  push('invalid', danger);

  return rules;
}

/**
 * Best-effort map from VS Code `tokenColors` to Monaco rules.
 * Uses the first scope segment as the Monaco token name; unknown / invalid
 * entries are skipped (safe fallback to defaults / inherit).
 */
export function monacoRulesFromTokenColors(
  tokenColors: readonly WorkbenchTokenColorSetting[],
): MonacoTokenRule[] {
  const rules: MonacoTokenRule[] = [];

  for (const entry of tokenColors) {
    const scopes = normalizeTokenScopes(entry.scope);
    if (scopes.length === 0) {
      continue;
    }
    const foreground = toMonacoTokenColor(entry.settings?.foreground);
    const background = toMonacoTokenColor(entry.settings?.background);
    const fontStyle = entry.settings?.fontStyle?.trim() || undefined;
    if (!foreground && !background && !fontStyle) {
      continue;
    }

    for (const scope of scopes) {
      const token = scopeToMonacoToken(scope);
      if (!token) {
        continue;
      }
      rules.push({
        token,
        ...(foreground ? { foreground } : {}),
        ...(background ? { background } : {}),
        ...(fontStyle ? { fontStyle } : {}),
      });
    }
  }

  return rules;
}

function normalizeTokenScopes(scope: WorkbenchTokenColorSetting['scope']): string[] {
  if (!scope) {
    return [];
  }
  if (typeof scope === 'string') {
    return scope
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return scope.map((part) => part.trim()).filter(Boolean);
}

function scopeToMonacoToken(scope: string): string | undefined {
  const trimmed = scope.trim();
  if (!trimmed) {
    return undefined;
  }
  // Prefer the leaf-most useful segment for Monaco's flatter token names.
  const parts = trimmed.split('.');
  if (parts[0] === 'comment') {
    return 'comment';
  }
  if (parts[0] === 'string') {
    return parts[1] === 'escape' ? 'string.escape' : 'string';
  }
  if (parts[0] === 'keyword') {
    return parts[1] === 'control' || parts[1] === 'flow' ? 'keyword.flow' : 'keyword';
  }
  if (parts[0] === 'constant' && parts[1] === 'numeric') {
    return 'number';
  }
  if (parts[0] === 'constant' && parts[1] === 'regexp') {
    return 'regexp';
  }
  if (parts[0] === 'entity' && parts[1] === 'name' && parts[2] === 'type') {
    return 'type';
  }
  if (parts[0] === 'entity' && parts[1] === 'name' && parts[2] === 'function') {
    return 'function';
  }
  if (parts[0] === 'entity' && parts[1] === 'name' && parts[2] === 'tag') {
    return 'tag';
  }
  if (parts[0] === 'entity' && parts[1] === 'other' && parts[2] === 'attribute-name') {
    return 'attribute.name';
  }
  if (parts[0] === 'variable') {
    return 'variable';
  }
  if (parts[0] === 'invalid') {
    return 'invalid';
  }
  // Fall back to the raw scope so hosts using matching tokenizer names still work.
  return trimmed;
}

/** Later lists win on duplicate `token` keys. */
export function mergeMonacoTokenRules(
  ...groups: Array<readonly MonacoTokenRule[] | undefined>
): MonacoTokenRule[] {
  const byToken = new Map<string, MonacoTokenRule>();
  for (const group of groups) {
    if (!group) {
      continue;
    }
    for (const rule of group) {
      byToken.set(rule.token, rule);
    }
  }
  return [...byToken.values()];
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

/**
 * Low-level `editor.defineTheme` wrapper. Safe to call on theme switches
 * without remounting editors that already use `themeId`.
 */
export function defineOrUpdateWorkbenchMonacoTheme(
  monacoInstance: typeof monaco,
  themeId: string,
  input: WorkbenchMonacoThemeInput,
): void {
  monacoInstance.editor.defineTheme(themeId, {
    base: input.base,
    inherit: true,
    rules: [...(input.rules ?? [])],
    colors: { ...(input.colors ?? {}) },
  });
}

export interface DefineMonacoWorkbenchThemeOptions {
  /** Extra rules merged after defaults + host registry (wins on duplicate tokens). */
  readonly rules?: readonly MonacoTokenRule[];
}

/**
 * Define the kit dark/light Monaco theme from live chrome CSS variables and
 * optional host tokenColors rules. Re-callable when `data-theme` / preset changes.
 */
export function buildWorkbenchMonacoThemeInput(
  resolvedTheme: MonacoWorkbenchResolvedTheme,
  cssColors: WorkbenchThemeCssColors,
  options?: DefineMonacoWorkbenchThemeOptions,
): WorkbenchMonacoThemeInput {
  return {
    base: resolvedTheme === 'light' ? 'vs' : 'vs-dark',
    colors: buildMonacoThemeColors(cssColors) as Record<string, string>,
    rules: mergeMonacoTokenRules(
      buildDefaultMonacoTokenRules(cssColors),
      getWorkbenchMonacoTokenRules(),
      options?.rules,
    ),
  };
}

export function defineMonacoWorkbenchTheme(
  monacoInstance: typeof monaco,
  resolvedTheme: MonacoWorkbenchResolvedTheme,
  root?: HTMLElement,
  options?: DefineMonacoWorkbenchThemeOptions,
): void {
  const themeRoot = resolveMonacoThemeRoot(root);
  if (!themeRoot) {
    return;
  }

  defineOrUpdateWorkbenchMonacoTheme(
    monacoInstance,
    monacoThemeForWorkspaceTheme(resolvedTheme),
    buildWorkbenchMonacoThemeInput(resolvedTheme, readWorkbenchThemeColors(themeRoot), options),
  );
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
