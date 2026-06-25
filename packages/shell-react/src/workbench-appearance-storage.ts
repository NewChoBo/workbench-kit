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
import type { WorkbenchStorageReader, WorkbenchStorageWriter } from '@workbench-kit/workbench-core';

export type { WorkbenchAppearanceSettings } from '@workbench-kit/react/workbench/themePresets';

export const DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY = 'workbench-kit/.workbench/appearance';

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
  storage?: WorkbenchStorageReader,
): WorkbenchAppearanceSettings {
  const resolvedStorage = storage ?? getBrowserLocalStorage();
  if (!resolvedStorage) {
    return DEFAULT_WORKBENCH_APPEARANCE;
  }

  try {
    const raw = resolvedStorage.getItem(storageKey);
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
  storage?: WorkbenchStorageWriter,
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

function getBrowserLocalStorage(): (WorkbenchStorageReader & WorkbenchStorageWriter) | undefined {
  if (!isWorkbenchAppearancePersistenceAvailable()) {
    return undefined;
  }

  return globalThis.localStorage;
}
