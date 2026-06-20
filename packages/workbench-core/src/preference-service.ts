import { Emitter, type Disposable } from '@workbench-kit/base';
import {
  createEmptyPreferenceValuesByScope,
  mergePreferenceValuesByScope,
  type PreferenceScope,
  type PreferenceValuesByScope,
  type WorkbenchSettingsConfig,
} from '@workbench-kit/workbench-config';
import type { ConfigurationContribution } from '@workbench-kit/workbench-extension-sdk';

import type { WorkbenchConfigurationContribution } from './registries.js';

export interface PreferenceChangeEvent {
  readonly effectiveValue: unknown;
  readonly key: string;
  readonly previousEffectiveValue: unknown;
  readonly scope: PreferenceScope;
}

export interface PreferenceInspection {
  readonly defaultValue: unknown;
  readonly effectiveValue: unknown;
  readonly localValue: unknown;
  readonly workspaceValue: unknown;
}

export interface PreferenceServiceOptions {
  readonly contributionDefaults?: WorkbenchSettingsConfig;
  readonly initialValuesByScope?: PreferenceValuesByScope;
}

export class PreferenceService implements Disposable {
  private readonly onDidChangePreferenceEmitter = new Emitter<PreferenceChangeEvent>();
  private contributionDefaults: WorkbenchSettingsConfig;
  private valuesByScope: PreferenceValuesByScope;

  readonly onDidChangePreference = this.onDidChangePreferenceEmitter.event;

  constructor(options: PreferenceServiceOptions = {}) {
    this.contributionDefaults = { ...(options.contributionDefaults ?? {}) };
    this.valuesByScope = {
      ...createEmptyPreferenceValuesByScope(),
      ...options.initialValuesByScope,
    };
  }

  getEffectiveValues(): WorkbenchSettingsConfig {
    return mergePreferenceValuesByScope({
      default: this.contributionDefaults,
      local: this.valuesByScope.local,
      workspace: this.valuesByScope.workspace,
    });
  }

  getEffectiveValue(key: string): unknown {
    return this.getEffectiveValues()[key];
  }

  getScopedValues(scope: PreferenceScope): WorkbenchSettingsConfig {
    if (scope === 'default') {
      return { ...this.contributionDefaults };
    }

    return { ...(this.valuesByScope[scope] ?? {}) };
  }

  getScopedValue(key: string, scope: PreferenceScope): unknown {
    return this.getScopedValues(scope)[key];
  }

  inspect(key: string): PreferenceInspection {
    return {
      defaultValue: this.contributionDefaults[key],
      effectiveValue: this.getEffectiveValue(key),
      localValue: this.valuesByScope.local?.[key],
      workspaceValue: this.valuesByScope.workspace?.[key],
    };
  }

  setContributionDefaults(defaults: WorkbenchSettingsConfig): void {
    this.contributionDefaults = { ...defaults };
  }

  setScopedValue(key: string, scope: PreferenceScope, value: unknown): void {
    if (scope === 'default') {
      this.contributionDefaults = {
        ...this.contributionDefaults,
        [key]: value,
      };
      this.emitPreferenceChange(key, 'default');
      return;
    }

    const currentScopeValues = { ...(this.valuesByScope[scope] ?? {}) };
    currentScopeValues[key] = value;
    this.valuesByScope = {
      ...this.valuesByScope,
      [scope]: currentScopeValues,
    };
    this.emitPreferenceChange(key, scope);
  }

  updateValuesByScope(scope: PreferenceScope, values: WorkbenchSettingsConfig): void {
    if (scope === 'default') {
      this.contributionDefaults = { ...values };
      return;
    }

    this.valuesByScope = {
      ...this.valuesByScope,
      [scope]: { ...values },
    };
  }

  getValuesByScope(): PreferenceValuesByScope {
    return {
      default: { ...this.contributionDefaults },
      local: { ...(this.valuesByScope.local ?? {}) },
      workspace: { ...(this.valuesByScope.workspace ?? {}) },
    };
  }

  dispose(): void {
    this.onDidChangePreferenceEmitter.dispose();
  }

  private emitPreferenceChange(key: string, scope: PreferenceScope): void {
    const effectiveValue = this.getEffectiveValue(key);
    this.onDidChangePreferenceEmitter.fire({
      effectiveValue,
      key,
      previousEffectiveValue: undefined,
      scope,
    });
  }
}

export function collectConfigurationDefaults(
  configurations: readonly WorkbenchConfigurationContribution[],
): WorkbenchSettingsConfig {
  return collectConfigurationContributionDefaults(
    configurations.map(({ configuration }) => configuration),
  );
}

export function collectConfigurationContributionDefaults(
  configurations: readonly ConfigurationContribution[],
): WorkbenchSettingsConfig {
  const defaults: Record<string, unknown> = {};

  for (const configuration of configurations) {
    for (const [key, property] of Object.entries(configuration.properties ?? {})) {
      if (Object.prototype.hasOwnProperty.call(property, 'default')) {
        defaults[key] = property.default;
      }
    }
  }

  return defaults;
}
