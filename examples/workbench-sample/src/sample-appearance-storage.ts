import {
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_LIGHT_THEME_PRESET,
  isDarkThemePresetId,
  isLightThemePresetId,
  type DarkThemePresetId,
  type LightThemePresetId,
  type WorkbenchColorSchemePreference,
} from '@workbench-kit/react/workbench';

export const SAMPLE_APPEARANCE_STORAGE_KEY = 'workbench-kit/.workbench/sample-appearance';

export interface SampleAppearanceSettings {
  darkPreset: DarkThemePresetId;
  lightPreset: LightThemePresetId;
  themePreference: WorkbenchColorSchemePreference;
}

export const DEFAULT_SAMPLE_APPEARANCE: SampleAppearanceSettings = {
  darkPreset: DEFAULT_DARK_THEME_PRESET,
  lightPreset: DEFAULT_LIGHT_THEME_PRESET,
  themePreference: 'system',
};

export function isSampleAppearancePersistenceAvailable(): boolean {
  try {
    return typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readPersistedSampleAppearance(
  storageKey = SAMPLE_APPEARANCE_STORAGE_KEY,
  storage?: Pick<Storage, 'getItem'>,
): SampleAppearanceSettings {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return DEFAULT_SAMPLE_APPEARANCE;
  }

  try {
    const raw = resolvedStorage.getItem(storageKey);
    if (!raw) {
      return DEFAULT_SAMPLE_APPEARANCE;
    }

    return normalizeSampleAppearance(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_SAMPLE_APPEARANCE;
  }
}

export function writePersistedSampleAppearance(
  settings: SampleAppearanceSettings,
  storageKey = SAMPLE_APPEARANCE_STORAGE_KEY,
  storage?: Pick<Storage, 'setItem'>,
): void {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(storageKey, JSON.stringify(settings, null, 2));
}

function normalizeSampleAppearance(value: unknown): SampleAppearanceSettings {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_SAMPLE_APPEARANCE;
  }

  const record = value as Record<string, unknown>;
  const themePreference = normalizeThemePreference(record.themePreference);
  const lightPreset = isLightThemePresetId(
    typeof record.lightPreset === 'string' ? record.lightPreset : undefined,
  )
    ? (record.lightPreset as LightThemePresetId)
    : DEFAULT_SAMPLE_APPEARANCE.lightPreset;
  const darkPreset = isDarkThemePresetId(
    typeof record.darkPreset === 'string' ? record.darkPreset : undefined,
  )
    ? (record.darkPreset as DarkThemePresetId)
    : DEFAULT_SAMPLE_APPEARANCE.darkPreset;

  return {
    darkPreset,
    lightPreset,
    themePreference,
  };
}

function normalizeThemePreference(value: unknown): WorkbenchColorSchemePreference {
  if (value === 'system' || value === 'light' || value === 'dark') {
    return value;
  }

  return DEFAULT_SAMPLE_APPEARANCE.themePreference;
}

function getBrowserLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
