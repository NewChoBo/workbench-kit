import type { PreferenceScope } from '@workbench-kit/workbench-config';

export const SETTINGS_EXTENSION_ID = 'workbench-kit.builtin.settings';

export const WORKBENCH_PREFERENCE_SCOPES = [
  { id: 'default', label: 'Default' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'local', label: 'Local' },
] as const satisfies ReadonlyArray<{ id: PreferenceScope; label: string }>;
