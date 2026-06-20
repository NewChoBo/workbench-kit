import { Emitter, toDisposable, type Disposable } from '@workbench-kit/base';
import type { LocalizationContribution } from '@workbench-kit/workbench-extension-sdk';

export interface WorkbenchLocalizationContribution extends LocalizationContribution {
  readonly extensionId: string;
}

export class LocalizationRegistry implements Disposable {
  private readonly localizationsByLocale = new Map<string, WorkbenchLocalizationContribution>();
  private readonly onDidRegisterLocalizationEmitter =
    new Emitter<WorkbenchLocalizationContribution>();

  readonly onDidRegisterLocalization = this.onDidRegisterLocalizationEmitter.event;

  getLocalization(locale: string): WorkbenchLocalizationContribution | undefined {
    return this.localizationsByLocale.get(locale);
  }

  getLocalizations(): readonly WorkbenchLocalizationContribution[] {
    return [...this.localizationsByLocale.values()];
  }

  registerLocalization(localization: WorkbenchLocalizationContribution): Disposable {
    if (this.localizationsByLocale.has(localization.locale)) {
      throw new Error(`Locale "${localization.locale}" is already registered.`);
    }

    this.localizationsByLocale.set(localization.locale, localization);
    this.onDidRegisterLocalizationEmitter.fire(localization);

    return toDisposable(() => {
      const current = this.localizationsByLocale.get(localization.locale);
      if (current === localization) {
        this.localizationsByLocale.delete(localization.locale);
      }
    });
  }

  translate(locale: string, key: string, fallback?: string): string {
    const localization = this.localizationsByLocale.get(locale);
    if (!localization) {
      return fallback ?? key;
    }

    return localization.translations[key] ?? fallback ?? key;
  }

  dispose(): void {
    this.localizationsByLocale.clear();
    this.onDidRegisterLocalizationEmitter.dispose();
  }
}
