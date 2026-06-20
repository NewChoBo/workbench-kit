import type { WorkbenchSettingsConfig } from './settings-config.js';

/** Runtime preference scopes supported in v1. */
export type PreferenceScope = 'default' | 'workspace' | 'local';

/** Documented future scopes — not merged or persisted yet. */
export const FUTURE_PREFERENCE_SCOPES = ['user', 'resource', 'secret'] as const;

export type FuturePreferenceScope = (typeof FUTURE_PREFERENCE_SCOPES)[number];

/** Lower index = lower precedence when merging effective values. */
export const PREFERENCE_SCOPE_MERGE_ORDER: readonly PreferenceScope[] = [
  'default',
  'workspace',
  'local',
];

export type PreferenceValuesByScope = Partial<Record<PreferenceScope, WorkbenchSettingsConfig>>;

export interface ScopedPreferenceLayer {
  readonly scope: PreferenceScope;
  readonly values: WorkbenchSettingsConfig;
}

export function isPreferenceScope(value: unknown): value is PreferenceScope {
  return value === 'default' || value === 'workspace' || value === 'local';
}

export function mergeScopedPreferences(
  layers: readonly ScopedPreferenceLayer[],
): WorkbenchSettingsConfig {
  const merged: Record<string, unknown> = {};

  for (const scope of PREFERENCE_SCOPE_MERGE_ORDER) {
    const layer = layers.find((candidate) => candidate.scope === scope);
    if (!layer) {
      continue;
    }

    for (const [key, value] of Object.entries(layer.values)) {
      merged[key] = value;
    }
  }

  return merged;
}

export function mergePreferenceValuesByScope(
  valuesByScope: PreferenceValuesByScope,
): WorkbenchSettingsConfig {
  return mergeScopedPreferences(
    PREFERENCE_SCOPE_MERGE_ORDER.flatMap((scope) => {
      const values = valuesByScope[scope];
      return values ? [{ scope, values }] : [];
    }),
  );
}

export function createEmptyPreferenceValuesByScope(): PreferenceValuesByScope {
  return {
    default: {},
    local: {},
    workspace: {},
  };
}
