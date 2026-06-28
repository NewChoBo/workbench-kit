import { Emitter, toDisposable, type Disposable } from '@workbench-kit/base';
import type { ThemeContribution } from '@workbench-kit/workbench-extension-sdk';

export interface WorkbenchThemeContribution extends ThemeContribution {
  readonly extensionId: string;
}

/**
 * Every token a light/dark preset defines (see `@workbench-kit/tokens/src/themes/**`).
 * Contributed theme `tokenOverrides` are applied as inline styles on the document root,
 * which outrank the preset's attribute-selector rules. A partial override (e.g. only
 * `--color-surface`) silently breaks contrast against the preset's untouched text/border
 * tokens, so contributed themes must replace the full set rather than a subset.
 */
export const REQUIRED_THEME_TOKEN_KEYS = [
  '--color-bg',
  '--color-bg-75',
  '--color-primary-side-bar-bg',
  '--color-primary-side-bar-bg-75',
  '--color-surface',
  '--color-surface-hover',
  '--color-surface-elevated',
  '--color-border',
  '--color-text',
  '--color-text-muted',
  '--color-text-subtle',
  '--color-accent',
  '--color-accent-hover',
  '--color-accent-foreground',
  '--color-focus-border',
  '--color-danger',
  '--color-danger-hover',
  '--scrollbar-thumb',
  '--scrollbar-thumb-hover',
  '--scrollbar-thumb-active',
] as const;

export class ThemeRegistry implements Disposable {
  private readonly onDidRegisterThemeEmitter = new Emitter<WorkbenchThemeContribution>();
  private readonly themesById = new Map<string, WorkbenchThemeContribution>();

  readonly onDidRegisterTheme = this.onDidRegisterThemeEmitter.event;

  getTheme(themeId: string): WorkbenchThemeContribution | undefined {
    return this.themesById.get(themeId);
  }

  getThemes(): readonly WorkbenchThemeContribution[] {
    return [...this.themesById.values()];
  }

  registerTheme(theme: WorkbenchThemeContribution): Disposable {
    if (this.themesById.has(theme.id)) {
      throw new Error(`Theme "${theme.id}" is already registered.`);
    }

    if (theme.mode !== 'dark' && theme.mode !== 'light') {
      throw new Error(`Theme "${theme.id}" must declare mode as "dark" or "light".`);
    }

    if (theme.tokenOverrides) {
      const missingKeys = REQUIRED_THEME_TOKEN_KEYS.filter(
        (key) => !Object.prototype.hasOwnProperty.call(theme.tokenOverrides!, key),
      );

      if (missingKeys.length > 0) {
        throw new Error(
          `Theme "${theme.id}" tokenOverrides is missing required token(s): ${missingKeys.join(', ')}. ` +
            'Contributed themes override the document root with inline styles, so a partial set ' +
            'breaks contrast against whatever light/dark preset is active; supply the full token set.',
        );
      }
    }

    this.themesById.set(theme.id, theme);
    this.onDidRegisterThemeEmitter.fire(theme);

    return toDisposable(() => {
      const current = this.themesById.get(theme.id);
      if (current === theme) {
        this.themesById.delete(theme.id);
      }
    });
  }

  dispose(): void {
    this.themesById.clear();
    this.onDidRegisterThemeEmitter.dispose();
  }
}

export function applyThemeTokenOverrides(
  target: HTMLElement,
  tokenOverrides: Readonly<Record<string, string>> | undefined,
  previousOverrides?: Readonly<Record<string, string>>,
): void {
  if (previousOverrides) {
    for (const key of Object.keys(previousOverrides)) {
      target.style.removeProperty(key);
    }
  }

  if (!tokenOverrides) {
    return;
  }

  for (const [key, value] of Object.entries(tokenOverrides)) {
    target.style.setProperty(key, value);
  }
}
