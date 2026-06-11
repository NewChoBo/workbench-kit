import type { WorkbenchExtensionManifest } from '@workbench-kit/workbench-extension-sdk';

/** Phase 0 placeholder — VS Code adapter mapping arrives in a later phase. */
export const WORKBENCH_KIT_VSCODE_ADAPTER_VERSION = '0.0.0' as const;

export type VscodeAdapterPlaceholder = {
  mapManifest(manifest: WorkbenchExtensionManifest): { contributes: Record<string, unknown> };
};
