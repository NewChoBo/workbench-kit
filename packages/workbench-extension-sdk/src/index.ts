/** Phase 0 placeholder — extension SDK types arrive in a later phase. */
export const WORKBENCH_KIT_EXTENSION_SDK_VERSION = '0.0.0' as const;

export type ExtensionManifestSchemaVersion = 1;

export type WorkbenchExtensionManifest = {
  schemaVersion: ExtensionManifestSchemaVersion;
  id: string;
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  engines: {
    workbench: string;
    extensionApi: string;
  };
  activationEvents: string[];
  contributes?: Record<string, unknown>;
};
