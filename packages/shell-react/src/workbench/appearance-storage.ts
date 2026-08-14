import {
  DEFAULT_DARK_THEME_PRESET,
  DEFAULT_LIGHT_THEME_PRESET,
  DEFAULT_SHELL_PRESET,
  isShellPresetId,
  type WorkbenchAppearanceSettings,
  type WorkbenchColorSchemePreference,
} from '@workbench-kit/react/workbench';
import {
  type WorkbenchPersistenceDiagnosticOptions,
  type WorkbenchPersistenceReadResult,
  type WorkbenchPersistenceWriteResult,
  type WorkbenchStorageReader,
  type WorkbenchStorageWriter,
} from '@workbench-kit/workbench-core';

import {
  readLocalJsonStorage,
  readLocalJsonStorageResult,
  resolveLocalWorkbenchStorage,
  writeLocalJsonStorage,
  writeLocalJsonStorageResult,
} from '../storage/local-json-storage.js';

export type { WorkbenchAppearanceSettings } from '@workbench-kit/react/workbench/themePresets';

export const DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY = 'workbench-kit/.workbench/appearance';

export const DEFAULT_WORKBENCH_APPEARANCE: WorkbenchAppearanceSettings = {
  darkPreset: DEFAULT_DARK_THEME_PRESET,
  lightPreset: DEFAULT_LIGHT_THEME_PRESET,
  shellPreset: DEFAULT_SHELL_PRESET,
  themePreference: 'system',
};

export function isWorkbenchAppearancePersistenceAvailable(): boolean {
  return resolveLocalWorkbenchStorage() !== undefined;
}

export function readPersistedWorkbenchAppearance(
  storageKey = DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
): WorkbenchAppearanceSettings {
  return readLocalJsonStorage(
    storageKey,
    normalizeWorkbenchAppearance,
    () => DEFAULT_WORKBENCH_APPEARANCE,
    storage,
  );
}

export function readPersistedWorkbenchAppearanceResult(
  storageKey = DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  storage?: WorkbenchStorageReader,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceReadResult<WorkbenchAppearanceSettings> {
  return readLocalJsonStorageResult(
    storageKey,
    normalizeWorkbenchAppearance,
    () => DEFAULT_WORKBENCH_APPEARANCE,
    storage,
    options,
  );
}

export function writePersistedWorkbenchAppearance(
  settings: WorkbenchAppearanceSettings,
  storageKey = DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
): void {
  writeLocalJsonStorage(storageKey, settings, storage);
}

export function writePersistedWorkbenchAppearanceResult(
  settings: WorkbenchAppearanceSettings,
  storageKey = DEFAULT_WORKBENCH_APPEARANCE_STORAGE_KEY,
  storage?: WorkbenchStorageWriter,
  options: WorkbenchPersistenceDiagnosticOptions = {},
): WorkbenchPersistenceWriteResult {
  return writeLocalJsonStorageResult(storageKey, settings, storage, options);
}

function normalizeWorkbenchAppearance(value: unknown): WorkbenchAppearanceSettings {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_WORKBENCH_APPEARANCE;
  }

  const record = value as Record<string, unknown>;
  const themePreference = normalizeThemePreference(record.themePreference);
  // Preset ids may belong to a contributed theme, which isn't known until extensions
  // register, so we can only validate shape here; the appearance UI falls back to a
  // default option if the persisted id no longer resolves to anything.
  const lightPreset = normalizePresetId(
    record.lightPreset,
    DEFAULT_WORKBENCH_APPEARANCE.lightPreset,
  );
  const darkPreset = normalizePresetId(record.darkPreset, DEFAULT_WORKBENCH_APPEARANCE.darkPreset);
  const shellPreset = normalizeShellPresetId(record.shellPreset);

  return {
    darkPreset,
    lightPreset,
    shellPreset,
    themePreference,
  };
}

function normalizeShellPresetId(value: unknown): string {
  return typeof value === 'string' && isShellPresetId(value) ? value : DEFAULT_SHELL_PRESET;
}

function normalizePresetId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function normalizeThemePreference(value: unknown): WorkbenchColorSchemePreference {
  if (value === 'system' || value === 'light' || value === 'dark') {
    return value;
  }

  return DEFAULT_WORKBENCH_APPEARANCE.themePreference;
}
