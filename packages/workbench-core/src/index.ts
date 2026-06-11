export const WORKBENCH_KIT_WORKBENCH_CORE_VERSION = '0.0.0' as const;

export type { ViewHost, ViewProvider } from '@workbench-kit/workbench-extension-sdk';
export {
  BUILTIN_WORKBENCH_EXTENSIONS,
  SAMPLE_WORKBENCH_EXTENSIONS,
} from './generated/bundled-extensions.js';
export {
  ExtensionRegistry,
  type ActivatedExtension,
  type ExtensionRegistryOptions,
  type WorkbenchExtensionDescription,
  type WorkbenchExtensionModule,
} from './extension-registry.js';
export {
  resolveWorkbenchExtensions,
  type WorkbenchExtensionResolution,
} from './extension-resolution.js';
export {
  createWorkbenchLayoutState,
  LayoutService,
  type WorkbenchLayoutChangeEvent,
  type WorkbenchLayoutState,
  type WorkbenchLayoutStateInput,
} from './layout-service.js';
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
