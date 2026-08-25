import {
  resetSampleHostStorage,
  seedSampleInstalledExtension,
  seedSampleWorkbenchAppearance,
  trackSampleAppearanceStorageWrites,
  type SampleAppearanceStorageWriteCounter,
  type SampleInstalledExtensionSeed,
} from '../fixtures/sampleHostStorage.js';

/**
 * Named sample-host scenarios shared by Storybook (and future browser E2E).
 * Each scenario only seeds storage / host options — assertions stay in stories.
 */
export function applyLoginGateScenario(): void {
  resetSampleHostStorage('none');
}

export function applyLoginSubmitScenario(): void {
  resetSampleHostStorage('none');
}

export function applyTesterWorkbenchScenario(): void {
  resetSampleHostStorage('tester');
}

export function applyDevtoolsInspectorsScenario(): void {
  resetSampleHostStorage('tester');
}

export function applyHostInstallStateScenario(
  record: SampleInstalledExtensionSeed = {
    category: 'editor',
    enabled: true,
    id: 'workbench-kit.samples.json-preview',
    installedAt: '2026-06-25T00:00:00.000Z',
    manifestUrl: 'workbench-kit.samples.json-preview',
  },
): void {
  resetSampleHostStorage('tester');
  seedSampleInstalledExtension('tester', record);
}

export function applyTesterDevAppJourneyScenario(): void {
  resetSampleHostStorage('tester');
}

export function applyBasicPermissionScopeScenario(): void {
  resetSampleHostStorage('basic');
}

export function applySidebarToggleScenario(): void {
  resetSampleHostStorage('tester');
}

export function applyFieldRemapEditorScenario(): void {
  resetSampleHostStorage('tester');
}

/** Seeded install record → Extensions activity Installed tab (no install click / reload). */
export function applyExtensionsInstalledListScenario(): void {
  applyHostInstallStateScenario();
}

/** Disabled persisted theme pack → live enable/disable lifecycle without navigation reload. */
export function applyThemeSoftLifecycleScenario(): void {
  applyHostInstallStateScenario({
    category: 'theme',
    enabled: false,
    id: 'workbench-kit.samples.theme-alt',
    installedAt: '2026-08-22T00:00:00.000Z',
    manifestUrl: 'workbench-kit.samples.theme-alt',
  });
}

/** Settings → Appearance category fields (color scheme / theme presets). */
export function applySettingsAppearanceScenario(): void {
  resetSampleHostStorage('tester');
}

/** Persisted light-only preset selected for dark mode; Settings must keep it raw until recovery. */
export function applySettingsWrongSchemeAppearanceScenario(): SampleAppearanceStorageWriteCounter {
  resetSampleHostStorage('tester');
  seedSampleWorkbenchAppearance({
    darkPreset: 'skyblue',
    lightPreset: 'skyblue',
    shellPreset: 'default',
    themePreference: 'dark',
  });
  return trackSampleAppearanceStorageWrites();
}

/** Public flat host option projection with no sample App persistence involved. */
export function applyFlatHostThemeOptionScenario(): SampleAppearanceStorageWriteCounter {
  resetSampleHostStorage('none');
  return trackSampleAppearanceStorageWrites();
}

/** Commands activity → command management sidebar. */
export function applyCommandsActivityScenario(): void {
  resetSampleHostStorage('tester');
}
