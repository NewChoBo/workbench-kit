import type { WorkbenchExtensionsConfig } from '@workbench-kit/workbench-config';

import type { WorkbenchExtensionDescription } from './extension-registry.js';
import type { InstalledExtensionRecord } from './extension-install-state.js';

const BUILTIN_EXTENSION_ID_PREFIX = 'workbench-kit.builtin.' as const;
const SAMPLE_EXTENSION_ID_PREFIX = 'workbench-kit.samples.' as const;

export function resolveInstalledAvailableExtensions(
  bundledExtensions: readonly WorkbenchExtensionDescription[],
  installedRecords: readonly InstalledExtensionRecord[],
): readonly WorkbenchExtensionDescription[] {
  const enabledInstalledIds = new Set(
    installedRecords.filter((record) => record.enabled).map((record) => record.id),
  );

  return bundledExtensions.filter((extension) => {
    const extensionId = extension.manifest.id;
    if (extensionId.startsWith(BUILTIN_EXTENSION_ID_PREFIX)) {
      return true;
    }

    if (extensionId.startsWith(SAMPLE_EXTENSION_ID_PREFIX)) {
      return enabledInstalledIds.has(extensionId);
    }

    return enabledInstalledIds.has(extensionId);
  });
}

export function mergeExtensionsConfigWithInstallState(
  config: WorkbenchExtensionsConfig,
  installedRecords: readonly InstalledExtensionRecord[],
): WorkbenchExtensionsConfig {
  const enabled = new Set(config.enabled);

  for (const record of installedRecords) {
    if (record.enabled) {
      enabled.add(record.id);
    } else {
      enabled.delete(record.id);
    }
  }

  return {
    ...config,
    enabled: [...enabled],
  };
}

export function resolveBundledExtensionByManifestUrl(
  manifestUrl: string,
  bundledExtensions: readonly WorkbenchExtensionDescription[],
): WorkbenchExtensionDescription | undefined {
  const byId = new Map(bundledExtensions.map((extension) => [extension.manifest.id, extension]));

  if (byId.has(manifestUrl)) {
    return byId.get(manifestUrl);
  }

  return bundledExtensions.find((extension) => {
    const normalizedManifestUrl = manifestUrl.replace(/^\.\//, '');
    return (
      extension.extensionPath === normalizedManifestUrl ||
      extension.extensionPath?.endsWith(`/${normalizedManifestUrl}`) ||
      manifestUrl.endsWith(`${extension.extensionPath}/workbench.extension.json`)
    );
  });
}
