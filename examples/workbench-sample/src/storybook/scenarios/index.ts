import {
  resetSampleHostStorage,
  seedSampleInstalledExtension,
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
