import {
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_LIGHT_THEME_PRESET,
  isDarkThemePresetId,
  isLightThemePresetId,
  type DarkThemePresetId,
  type LightThemePresetId,
  type WorkbenchAppearanceSettings,
  type WorkbenchColorSchemePreference,
} from '@workbench-kit/react/workbench/themePresets';

export type { WorkbenchAppearanceSettings } from '@workbench-kit/react/workbench/themePresets';

export const DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY = 'workbench-kit/.workbench/appearance';

/** @deprecated Sample-only key; migrated automatically on read. */
const LEGACY_SAMPLE_APPEARANCE_STORAGE_KEY = 'workbench-kit/.workbench/sample-appearance';

export const DEFAULT_WORKBENCH_APPEARANCE: WorkbenchAppearanceSettings = {
  darkPreset: DEFAULT_DARK_THEME_PRESET,
  lightPreset: DEFAULT_LIGHT_THEME_PRESET,
  themePreference: 'system',
};

export function isWorkbenchAppearancePersistenceAvailable(): boolean {
  try {
    return typeof globalThis.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function readPersistedWorkbenchAppearance(
  storageKey = DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  storage?: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
): WorkbenchAppearanceSettings {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return DEFAULT_WORKBENCH_APPEARANCE;
  }

  try {
    let raw = resolvedStorage.getItem(storageKey);
    if (!raw && storageKey === DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY) {
      raw = migrateLegacySampleAppearance(resolvedStorage);
    }
    if (!raw) {
      return DEFAULT_WORKBENCH_APPEARANCE;
    }

    return normalizeWorkbenchAppearance(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_WORKBENCH_APPEARANCE;
  }
}

export function writePersistedWorkbenchAppearance(
  settings: WorkbenchAppearanceSettings,
  storageKey = DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  storage?: Pick<Storage, 'setItem'>,
): void {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.setItem(storageKey, JSON.stringify(settings, null, 2));
  } catch {
    // Ignore quota and security errors so the shell keeps working offline.
  }
}

function migrateLegacySampleAppearance(
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
): string | null {
  const legacy = storage.getItem(LEGACY_SAMPLE_APPEARANCE_STORAGE_KEY);
  if (!legacy) {
    return null;
  }

  try {
    storage.setItem(DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY, legacy);
    storage.removeItem(LEGACY_SAMPLE_APPEARANCE_STORAGE_KEY);
  } catch {
    // Keep legacy value readable even when migration write fails.
  }

  return legacy;
}

function normalizeWorkbenchAppearance(value: unknown): WorkbenchAppearanceSettings {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_WORKBENCH_APPEARANCE;
  }

  const record = value as Record<string, unknown>;
  const themePreference = normalizeThemePreference(record.themePreference);
  const lightPreset = isLightThemePresetId(
    typeof record.lightPreset === 'string' ? record.lightPreset : undefined,
  )
    ? (record.lightPreset as LightThemePresetId)
    : DEFAULT_WORKBENCH_APPEARANCE.lightPreset;
  const darkPreset = isDarkThemePresetId(
    typeof record.darkPreset === 'string' ? record.darkPreset : undefined,
  )
    ? (record.darkPreset as DarkThemePresetId)
    : DEFAULT_WORKBENCH_APPEARANCE.darkPreset;

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

  return DEFAULT_WORKBENCH_APPEARANCE.themePreference;
}

function getBrowserLocalStorage(): Storage | undefined {
  if (!isWorkbenchAppearancePersistenceAvailable()) {
    return undefined;
  }

  return globalThis.localStorage;
}
