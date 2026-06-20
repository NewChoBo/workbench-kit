import { Emitter, toDisposable, type Disposable } from '@workbench-kit/base';
import type { ThemeContribution } from '@workbench-kit/workbench-extension-sdk';

export interface WorkbenchThemeContribution extends ThemeContribution {
  readonly extensionId: string;
}

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
