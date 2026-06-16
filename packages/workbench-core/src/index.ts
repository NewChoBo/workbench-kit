export const WORKBENCH_KIT_WORKBENCH_CORE_VERSION = '0.0.0' as const;

export type {
  EditorHost,
  EditorHostCreateContext,
  EditorHostFactory,
  EditorResolveContext,
  EditorResolver,
  ViewHostCreateContext,
  ViewHostFactory,
  WorkbenchEditorSavePort,
} from '@workbench-kit/workbench-extension-sdk';
export {
  DEFAULT_EDITOR_HOST_FACTORY_ID,
  DEFAULT_VIEW_HOST_FACTORY_ID,
  WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID,
} from '@workbench-kit/workbench-extension-sdk';
export type {
  ViewHost,
  ViewHostSize,
  ViewProvider,
  WorkbenchEditorServiceCapability,
} from '@workbench-kit/workbench-extension-sdk';
export {
  BUILTIN_WORKBENCH_EXTENSIONS,
  SAMPLE_WORKBENCH_EXTENSIONS,
} from './generated/bundled-extensions.js';
export {
  CapabilityRegistry,
  createCapabilityRegistry,
  toCapabilityMap,
  type CapabilityProvider,
} from './capability-registry.js';
export {
  createEditorResolverRegistry,
  EditorResolverRegistry,
} from './editor-resolver-registry.js';
export {
  createEditorService,
  DEFAULT_EDITOR_GROUP_ID,
  EditorService,
  type EditorChangeEvent,
  type EditorGroupState,
  type EditorServiceOptions,
  type EditorState,
  type EditorTabState,
  type MoveEditorOptions,
  type OpenEditorOptions,
  type SplitEditorOptions,
} from './editor-service.js';
export {
  EDITOR_SAVE_COMMAND_ID,
  registerEditorSaveCommand,
  saveActiveEditor,
  type SaveActiveEditorInput,
  type SaveActiveEditorResult,
} from './editor-save.js';
export {
  createDefaultViewHostFactory,
  createEditorHostFactoryRegistry,
  createViewHostFactoryRegistry,
  EditorHostFactoryRegistry,
  ViewHostFactoryRegistry,
} from './host-factory-registry.js';
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
  DEFAULT_WORKBENCH_LAYOUT_STATE,
  LayoutService,
  type WorkbenchLayoutChangeEvent,
  type WorkbenchLayoutState,
  type WorkbenchLayoutStateInput,
} from './layout-service.js';
export {
  ActivityRegistry,
  ConfigurationRegistry,
  EditorRegistry,
  MenuRegistry,
  ViewRegistry,
  type WorkbenchActivityContribution,
  type WorkbenchConfigurationContribution,
  type WorkbenchEditorContribution,
  type WorkbenchViewContainerContribution,
  type WorkbenchViewContribution,
} from './registries.js';
