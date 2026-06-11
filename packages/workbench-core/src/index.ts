export const WORKBENCH_KIT_WORKBENCH_CORE_VERSION = '0.0.0' as const;

export {
  ExtensionRegistry,
  type ActivatedExtension,
  type ExtensionRegistryOptions,
  type WorkbenchExtensionDescription,
  type WorkbenchExtensionModule,
} from './extension-registry.js';
export {
  ActivityRegistry,
  ConfigurationRegistry,
  MenuRegistry,
  ViewRegistry,
  type WorkbenchActivityContribution,
  type WorkbenchConfigurationContribution,
  type WorkbenchViewContainerContribution,
  type WorkbenchViewContribution,
} from './registries.js';
