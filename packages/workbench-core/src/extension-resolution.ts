import type { WorkbenchExtensionsConfig } from '@workbench-kit/workbench-config';

import type { WorkbenchExtensionDescription } from './extension-registry.js';

export interface WorkbenchExtensionResolution {
  readonly disabledExtensions: readonly WorkbenchExtensionDescription[];
  readonly enabledExtensions: readonly WorkbenchExtensionDescription[];
  readonly missingExtensionIds: readonly string[];
}

export function resolveWorkbenchExtensions(
  config: WorkbenchExtensionsConfig,
  availableExtensions: readonly WorkbenchExtensionDescription[],
): WorkbenchExtensionResolution {
  const availableById = new Map(
    availableExtensions.map((extension) => [extension.manifest.id, extension]),
  );
  const enabledExtensions: WorkbenchExtensionDescription[] = [];
  const missingExtensionIds: string[] = [];

  for (const extensionId of config.enabled) {
    const extension = availableById.get(extensionId);
    if (!extension) {
      missingExtensionIds.push(extensionId);
      continue;
    }

    enabledExtensions.push(extension);
  }

  const enabledIds = new Set(enabledExtensions.map((extension) => extension.manifest.id));
  const disabledExtensions = availableExtensions.filter(
    (extension) => !enabledIds.has(extension.manifest.id),
  );

  return {
    disabledExtensions,
    enabledExtensions,
    missingExtensionIds,
  };
}
