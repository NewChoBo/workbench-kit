import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  collectConfigurationDefaults,
  createEditorService,
  ExtensionRegistry,
  LayoutService,
  loadInstalledExtensionsResult,
  mergeExtensionsConfigWithInstallState,
  PreferenceService,
  registerEditorSaveCommand,
  registerHostWorkbenchThemes,
  resolveInstalledAvailableExtensions,
  resolveWorkbenchExtensions,
  DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID,
  verifyWorkbenchExtensionsAgainstLock,
  type EditorState,
  type EditorService,
  type ActivityRegistry,
  type ConfigurationRegistry,
  type ExtensionIntegrityMode,
  type LocalizationRegistry,
  type MenuRegistry,
  type PreferenceService as PreferenceServiceType,
  type StatusBarRegistry,
  type ThemeRegistry,
  type ViewRegistry,
  type ViewHostFactoryRegistry,
  type WorkbenchHostThemeRegistration,
  type WorkbenchPersistenceDiagnosticHandler,
  type WorkbenchStorageAdapter,
  type WorkbenchEditorSavePort,
  type WorkbenchExtensionDescription,
  type WorkbenchLayoutStateInput,
  type ViewHostFactory,
} from '@workbench-kit/workbench-core';
import {
  ContextKeyService,
  createWorkbenchPermissionContextKeys,
  type CommandRegistry,
  type ContextKeyValue,
  type KeybindingRegistry,
} from '@workbench-kit/platform';
import type {
  WorkbenchExtensionsConfig,
  WorkbenchExtensionsLock,
  WorkbenchKeybindingDefinition,
  WorkbenchSettingsConfig,
  WorkbenchUserCommandDefinition,
} from '@workbench-kit/workbench-config';
import {
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  isWorkbenchLayoutPersistenceAvailable,
  resolvePersistedWorkbenchLayoutResult,
  writePersistedWorkbenchLayoutResult,
} from '../workbench/layout-storage.js';
import {
  DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  isWorkbenchEditorStatePersistenceAvailable,
  readPersistedEditorStateResult,
  writePersistedEditorStateResult,
} from '../editor/state-storage.js';
import {
  DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  isWorkbenchKeybindingPersistenceAvailable,
  readPersistedKeybindingOverridesResult,
  writePersistedKeybindingOverridesResult,
} from '../management/keybinding-overrides-storage.js';
import {
  BUILTIN_EXPLORER_VIEW_CONTAINER_ID,
  publishExplorerRevealRequest,
  runExplorerHostCommandSideEffects,
} from '../explorer/reveal.js';
import {
  BUILTIN_EXTENSIONS_FOCUS_COMMAND_ID,
  BUILTIN_EXTENSIONS_VIEW_CONTAINER_ID,
} from '../extensions/view-data.js';
import {
  createWorkbenchExtensionActivationAccess,
  createWorkbenchExtensionActivationStateReader,
  createWorkbenchExtensionCatalogReader,
  createWorkbenchSettingsCapabilityPublisher,
  type WorkbenchExtensionActivationAccess,
  type WorkbenchExtensionActivationStateReader,
  type WorkbenchExtensionCatalogReader,
  type WorkbenchSettingsCapabilityPublisher,
} from './focused-extension-services.js';

export type {
  WorkbenchExtensionActivationAccess,
  WorkbenchExtensionActivationStateReader,
  WorkbenchExtensionCatalogReader,
  WorkbenchSettingsCapabilityPublication,
  WorkbenchSettingsCapabilityPublisher,
} from './focused-extension-services.js';
import {
  DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  isWorkbenchLocalPreferencePersistenceAvailable,
  readPersistedLocalPreferencesResult,
  writePersistedLocalPreferencesResult,
} from '../management/preference-settings-storage.js';
import { registerWorkbenchUserCommands } from '../workbench/user-commands.js';
import { EditorWorkspaceReconciler } from '../editor/workspace-reconcile.js';
import {
  DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS,
  type EditorDocumentViewProvider,
} from '../editor/view-providers.js';
import type { EditorDocumentViewProviderRegistry } from '@workbench-kit/workbench-core';
import { ExtensionEnablementController } from '../extensions/extension-enablement-controller.js';
import { ExtensionEnablementContext } from '../extensions/extension-enablement-context.js';
import {
  reportPersistenceWriteResult,
  reportPersistenceDiagnostic,
  usePersistenceDiagnosticHandlerRef,
  useReportPersistenceReadDiagnostic,
} from '../storage/persistence-diagnostics.js';
import { WorkbenchPersistenceDiagnosticContext } from './persistence-diagnostic-context.js';

export interface WorkbenchWorkspaceHostPort extends WorkbenchEditorSavePort {
  readonly capabilityId?: string | undefined;
  readonly service?: unknown;
  dispose?(): void;
}

export type { WorkbenchStorageAdapter };

const EMPTY_AVAILABLE_EXTENSIONS: readonly WorkbenchExtensionDescription[] = Object.freeze([]);
const EMPTY_HOST_THEMES: readonly WorkbenchHostThemeRegistration[] = Object.freeze([]);
const EMPTY_USER_COMMANDS: readonly WorkbenchUserCommandDefinition[] = Object.freeze([]);

export interface WorkbenchProviderProps {
  /** Extensions available to this host. Defaults to none; hosts opt into built-ins explicitly. */
  availableExtensions?: readonly WorkbenchExtensionDescription[];
  children: ReactNode;
  contextKeyValues?: Readonly<Record<string, ContextKeyValue>> | undefined;
  documentViewProviders?: readonly EditorDocumentViewProvider[] | undefined;
  /**
   * When set with `extensionIntegrityMode` other than `off`, enabled extensions
   * are checked against the lock before registration.
   */
  extensionsLock?: WorkbenchExtensionsLock | undefined;
  /**
   * Lock verification mode. Default `off` preserves existing hosts.
   * Sample hosts may opt into `fail-closed`.
   */
  extensionIntegrityMode?: ExtensionIntegrityMode | undefined;
  extensionsConfig?: WorkbenchExtensionsConfig;
  editorStateStorage?: WorkbenchStorageAdapter;
  editorStateStorageKey?: string;
  hostThemes?: readonly WorkbenchHostThemeRegistration[];
  initialKeybindingOverrides?: readonly WorkbenchKeybindingDefinition[];
  initialEditorState?: EditorState;
  initialLayout?: WorkbenchLayoutStateInput;
  initialWorkspaceSettings?: WorkbenchSettingsConfig;
  includeDefaultDocumentViewProviders?: boolean | undefined;
  installedExtensionsStorage?: WorkbenchStorageAdapter;
  installedExtensionsStorageKey?: string;
  keybindingOverridesStorage?: WorkbenchStorageAdapter;
  keybindingOverridesStorageKey?: string;
  layoutStorage?: WorkbenchStorageAdapter;
  layoutStorageKey?: string;
  localPreferenceStorage?: WorkbenchStorageAdapter;
  localPreferenceStorageKey?: string;
  onKeybindingOverridesChange?:
    ((overrides: readonly WorkbenchKeybindingDefinition[]) => void) | undefined;
  onPersistenceDiagnostic?: WorkbenchPersistenceDiagnosticHandler | undefined;
  persistEditorState?: boolean;
  persistKeybindingOverrides?: boolean;
  persistLayout?: boolean;
  persistLocalPreferences?: boolean;
  userCommands?: readonly WorkbenchUserCommandDefinition[];
  /** Host-owned framework adapters registered before extension activation. */
  viewHostFactories?: readonly ViewHostFactory[] | undefined;
  workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

export interface WorkbenchContextValue {
  activateCommand(commandId: string): Promise<readonly { readonly extensionId: string }[]>;
  activities: ActivityRegistry;
  availableExtensions: readonly WorkbenchExtensionDescription[];
  commands: CommandRegistry;
  configurations: ConfigurationRegistry;
  contextKeyService: ContextKeyService;
  editorDocumentViewProviders: EditorDocumentViewProviderRegistry;
  editorService: EditorService;
  executeCommand(commandId: string, ...args: unknown[]): Promise<unknown>;
  extensionActivation: WorkbenchExtensionActivationAccess;
  extensionActivationState: WorkbenchExtensionActivationStateReader;
  extensionCatalog: WorkbenchExtensionCatalogReader;
  installedExtensionsStorage?: WorkbenchStorageAdapter;
  installedExtensionsStorageKey: string;
  keybindings: KeybindingRegistry;
  keybindingOverrides: readonly WorkbenchKeybindingDefinition[];
  layoutService: LayoutService;
  localizations: LocalizationRegistry;
  menus: MenuRegistry;
  missingExtensionIds: readonly string[];
  preferenceService: PreferenceServiceType;
  resetCommandKeybindingOverride(commandId: string): void;
  setCommandKeybindingOverride(commandId: string, key: string): void;
  settingsCapabilityPublisher: WorkbenchSettingsCapabilityPublisher;
  statusBar: StatusBarRegistry;
  themes: ThemeRegistry;
  viewHostFactories: ViewHostFactoryRegistry;
  views: ViewRegistry;
  waitForExtensionStartup(): Promise<void>;
  workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

interface WorkbenchProviderServices {
  activateStartup(): void;
  availableExtensions: readonly WorkbenchExtensionDescription[];
  dispose(): void;
  editorDocumentViewProviders: EditorDocumentViewProviderRegistry;
  editorService: EditorService;
  extensionEnablement: ExtensionEnablementController;
  extensionRegistry: ExtensionRegistry;
  layoutService: LayoutService;
  missingExtensionIds: readonly string[];
  preferenceService: PreferenceServiceType;
  waitForExtensionStartup(): Promise<void>;
  workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

interface DeferredProviderDispose {
  readonly services: WorkbenchProviderServices;
  readonly timeout: ReturnType<typeof setTimeout>;
}

interface KeybindingOverridesState {
  readonly initialOverrides: readonly WorkbenchKeybindingDefinition[] | undefined;
  readonly overrides: readonly WorkbenchKeybindingDefinition[];
  readonly shouldPersist: boolean;
  readonly storage: WorkbenchStorageAdapter | undefined;
  readonly storageKey: string;
  readonly writeEligible: boolean;
}

const WorkbenchContext = createContext<WorkbenchContextValue | undefined>(undefined);

function isKeybindingStateCurrent(
  state: KeybindingOverridesState,
  initialOverrides: readonly WorkbenchKeybindingDefinition[] | undefined,
  shouldPersist: boolean,
  storage: WorkbenchStorageAdapter | undefined,
  storageKey: string,
): boolean {
  return (
    state.initialOverrides === initialOverrides &&
    state.shouldPersist === shouldPersist &&
    state.storage === storage &&
    state.storageKey === storageKey
  );
}

function createKeybindingOverridesState(
  initialOverrides: readonly WorkbenchKeybindingDefinition[] | undefined,
  resolvedOverrides: readonly WorkbenchKeybindingDefinition[],
  readFailed: boolean,
  shouldPersist: boolean,
  storage: WorkbenchStorageAdapter | undefined,
  storageKey: string,
): KeybindingOverridesState {
  return {
    initialOverrides,
    overrides: resolvedOverrides,
    shouldPersist,
    storage,
    storageKey,
    writeEligible: initialOverrides !== undefined || !readFailed,
  };
}

function createInitialContextKeyService(
  contextKeyValues: Readonly<Record<string, ContextKeyValue>> | undefined,
): ContextKeyService {
  const service = new ContextKeyService();

  for (const [key, value] of Object.entries(
    createWorkbenchPermissionContextKeys({ role: 'owner' }),
  )) {
    service.set(key, value);
  }

  for (const [key, value] of Object.entries(contextKeyValues ?? {})) {
    service.set(key, value);
  }

  return service;
}

export function WorkbenchProvider({
  availableExtensions,
  children,
  contextKeyValues,
  documentViewProviders,
  editorStateStorage,
  editorStateStorageKey = DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  extensionIntegrityMode = 'off',
  extensionsConfig,
  extensionsLock,
  hostThemes = EMPTY_HOST_THEMES,
  initialEditorState,
  initialKeybindingOverrides,
  initialLayout,
  initialWorkspaceSettings,
  includeDefaultDocumentViewProviders,
  installedExtensionsStorage,
  installedExtensionsStorageKey = DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  keybindingOverridesStorage,
  keybindingOverridesStorageKey = DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  layoutStorage,
  layoutStorageKey = DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  localPreferenceStorage,
  localPreferenceStorageKey = DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  onKeybindingOverridesChange,
  onPersistenceDiagnostic,
  persistEditorState,
  persistKeybindingOverrides,
  persistLayout,
  persistLocalPreferences,
  userCommands = EMPTY_USER_COMMANDS,
  viewHostFactories,
  workspaceHostPort,
}: WorkbenchProviderProps) {
  const hostAvailableExtensions = availableExtensions ?? EMPTY_AVAILABLE_EXTENSIONS;
  const deferredDisposeRef = useRef<DeferredProviderDispose | undefined>(undefined);
  const shouldPersistEditorState =
    persistEditorState ??
    (editorStateStorage !== undefined || isWorkbenchEditorStatePersistenceAvailable());
  const shouldPersistKeybindingOverrides =
    persistKeybindingOverrides ??
    (keybindingOverridesStorage !== undefined || isWorkbenchKeybindingPersistenceAvailable());
  const shouldPersistLayout =
    persistLayout ?? (layoutStorage !== undefined || isWorkbenchLayoutPersistenceAvailable());
  const shouldPersistLocalPreferences =
    persistLocalPreferences ??
    (localPreferenceStorage !== undefined || isWorkbenchLocalPreferencePersistenceAvailable());
  const diagnosticHandlerRef = usePersistenceDiagnosticHandlerRef(onPersistenceDiagnostic);
  const resolvedInitialLayoutResult = useMemo(
    () =>
      resolvePersistedWorkbenchLayoutResult(initialLayout, {
        persistLayout: shouldPersistLayout,
        storage: layoutStorage,
        storageKey: layoutStorageKey,
      }),
    [initialLayout, layoutStorage, layoutStorageKey, shouldPersistLayout],
  );
  const resolvedInitialLayout = resolvedInitialLayoutResult.value;
  const resolvedInitialEditorStateResult = useMemo(
    () =>
      initialEditorState !== undefined
        ? { value: initialEditorState }
        : shouldPersistEditorState
          ? readPersistedEditorStateResult(editorStateStorageKey, editorStateStorage)
          : { value: undefined },
    [editorStateStorage, editorStateStorageKey, initialEditorState, shouldPersistEditorState],
  );
  const resolvedInitialEditorState = resolvedInitialEditorStateResult.value;
  const resolvedInitialKeybindingOverridesResult = useMemo(
    () =>
      initialKeybindingOverrides !== undefined
        ? { value: initialKeybindingOverrides }
        : shouldPersistKeybindingOverrides
          ? readPersistedKeybindingOverridesResult(
              keybindingOverridesStorageKey,
              keybindingOverridesStorage,
            )
          : { value: [] },
    [
      initialKeybindingOverrides,
      keybindingOverridesStorage,
      keybindingOverridesStorageKey,
      shouldPersistKeybindingOverrides,
    ],
  );
  const resolvedInitialKeybindingOverrides = resolvedInitialKeybindingOverridesResult.value;
  const [keybindingState, setKeybindingState] = useState<KeybindingOverridesState>(() =>
    createKeybindingOverridesState(
      initialKeybindingOverrides,
      resolvedInitialKeybindingOverrides,
      resolvedInitialKeybindingOverridesResult.diagnostic !== undefined,
      shouldPersistKeybindingOverrides,
      keybindingOverridesStorage,
      keybindingOverridesStorageKey,
    ),
  );
  const keybindingStateIsCurrent = isKeybindingStateCurrent(
    keybindingState,
    initialKeybindingOverrides,
    shouldPersistKeybindingOverrides,
    keybindingOverridesStorage,
    keybindingOverridesStorageKey,
  );
  const keybindingOverrides = keybindingStateIsCurrent
    ? keybindingState.overrides
    : resolvedInitialKeybindingOverrides;
  const [contextKeyService] = useState(() => createInitialContextKeyService(contextKeyValues));

  useEffect(() => {
    return () => {
      contextKeyService.dispose();
    };
  }, [contextKeyService]);

  useEffect(() => {
    if (contextKeyValues === undefined) {
      return;
    }

    for (const [key, value] of Object.entries(contextKeyValues)) {
      contextKeyService.set(key, value);
    }
  }, [contextKeyService, contextKeyValues]);

  useEffect(() => {
    setKeybindingState((current) =>
      isKeybindingStateCurrent(
        current,
        initialKeybindingOverrides,
        shouldPersistKeybindingOverrides,
        keybindingOverridesStorage,
        keybindingOverridesStorageKey,
      )
        ? current
        : createKeybindingOverridesState(
            initialKeybindingOverrides,
            resolvedInitialKeybindingOverrides,
            resolvedInitialKeybindingOverridesResult.diagnostic !== undefined,
            shouldPersistKeybindingOverrides,
            keybindingOverridesStorage,
            keybindingOverridesStorageKey,
          ),
    );
  }, [
    initialKeybindingOverrides,
    keybindingOverridesStorage,
    keybindingOverridesStorageKey,
    resolvedInitialKeybindingOverrides,
    resolvedInitialKeybindingOverridesResult.diagnostic,
    shouldPersistKeybindingOverrides,
  ]);

  const setCommandKeybindingOverride = useCallback(
    (commandId: string, key: string) => {
      setKeybindingState((current) => {
        const currentOverrides = isKeybindingStateCurrent(
          current,
          initialKeybindingOverrides,
          shouldPersistKeybindingOverrides,
          keybindingOverridesStorage,
          keybindingOverridesStorageKey,
        )
          ? current.overrides
          : resolvedInitialKeybindingOverrides;
        const without = currentOverrides.filter((binding) => binding.command !== commandId);
        return {
          initialOverrides: initialKeybindingOverrides,
          overrides: [...without, { command: commandId, key }],
          shouldPersist: shouldPersistKeybindingOverrides,
          storage: keybindingOverridesStorage,
          storageKey: keybindingOverridesStorageKey,
          writeEligible: true,
        };
      });
    },
    [
      initialKeybindingOverrides,
      keybindingOverridesStorage,
      keybindingOverridesStorageKey,
      resolvedInitialKeybindingOverrides,
      shouldPersistKeybindingOverrides,
    ],
  );

  const resetCommandKeybindingOverride = useCallback(
    (commandId: string) => {
      setKeybindingState((current) => {
        const currentOverrides = isKeybindingStateCurrent(
          current,
          initialKeybindingOverrides,
          shouldPersistKeybindingOverrides,
          keybindingOverridesStorage,
          keybindingOverridesStorageKey,
        )
          ? current.overrides
          : resolvedInitialKeybindingOverrides;
        return {
          initialOverrides: initialKeybindingOverrides,
          overrides: currentOverrides.filter((binding) => binding.command !== commandId),
          shouldPersist: shouldPersistKeybindingOverrides,
          storage: keybindingOverridesStorage,
          storageKey: keybindingOverridesStorageKey,
          writeEligible: true,
        };
      });
    },
    [
      initialKeybindingOverrides,
      keybindingOverridesStorage,
      keybindingOverridesStorageKey,
      resolvedInitialKeybindingOverrides,
      shouldPersistKeybindingOverrides,
    ],
  );

  useEffect(() => {
    if (!keybindingStateIsCurrent) {
      return;
    }

    onKeybindingOverridesChange?.(keybindingState.overrides);
    if (!shouldPersistKeybindingOverrides || !keybindingState.writeEligible) {
      return;
    }

    reportPersistenceWriteResult(
      writePersistedKeybindingOverridesResult(
        keybindingState.overrides,
        keybindingOverridesStorageKey,
        keybindingOverridesStorage,
      ),
      diagnosticHandlerRef,
    );
  }, [
    diagnosticHandlerRef,
    keybindingState,
    keybindingStateIsCurrent,
    keybindingOverridesStorage,
    keybindingOverridesStorageKey,
    onKeybindingOverridesChange,
    shouldPersistKeybindingOverrides,
  ]);

  const resolvedInitialLocalPreferencesResult = useMemo(
    () =>
      shouldPersistLocalPreferences
        ? readPersistedLocalPreferencesResult(localPreferenceStorageKey, localPreferenceStorage)
        : { value: {} },
    [localPreferenceStorage, localPreferenceStorageKey, shouldPersistLocalPreferences],
  );
  const resolvedInitialLocalPreferences = resolvedInitialLocalPreferencesResult.value;
  const installedExtensionsReadResult = useMemo(
    () => loadInstalledExtensionsResult(installedExtensionsStorageKey, installedExtensionsStorage),
    [installedExtensionsStorage, installedExtensionsStorageKey],
  );
  const installedExtensionRecords = installedExtensionsReadResult.value;

  useReportPersistenceReadDiagnostic(
    resolvedInitialLayoutResult.diagnostic,
    [initialLayout, layoutStorage, layoutStorageKey, shouldPersistLayout],
    diagnosticHandlerRef,
  );
  useReportPersistenceReadDiagnostic(
    resolvedInitialEditorStateResult.diagnostic,
    [initialEditorState, editorStateStorage, editorStateStorageKey, shouldPersistEditorState],
    diagnosticHandlerRef,
  );
  useReportPersistenceReadDiagnostic(
    resolvedInitialKeybindingOverridesResult.diagnostic,
    [
      initialKeybindingOverrides,
      keybindingOverridesStorage,
      keybindingOverridesStorageKey,
      shouldPersistKeybindingOverrides,
    ],
    diagnosticHandlerRef,
  );
  useReportPersistenceReadDiagnostic(
    resolvedInitialLocalPreferencesResult.diagnostic,
    [localPreferenceStorage, localPreferenceStorageKey, shouldPersistLocalPreferences],
    diagnosticHandlerRef,
  );
  useReportPersistenceReadDiagnostic(
    installedExtensionsReadResult.diagnostic,
    [installedExtensionsStorage, installedExtensionsStorageKey],
    diagnosticHandlerRef,
  );

  const services = useMemo<WorkbenchProviderServices>(() => {
    const extensionRegistry = new ExtensionRegistry();
    const viewHostFactoryDisposables = (viewHostFactories ?? []).map((factory) =>
      extensionRegistry.viewHostFactories.register(factory),
    );
    const editorDocumentViewProviders = extensionRegistry.editorDocumentViews;
    const editorDocumentViewProviderDisposables = [
      ...(includeDefaultDocumentViewProviders === false
        ? []
        : DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS),
      ...(documentViewProviders ?? []),
    ].map((provider) => editorDocumentViewProviders.registerProvider(provider));
    const layoutService = new LayoutService(resolvedInitialLayout);
    const editorService = createEditorService({
      editorHostFactories: extensionRegistry.editorHostFactories,
      editorResolvers: extensionRegistry.editorResolvers,
      initialState: resolvedInitialEditorState,
      resolveEditorResource: workspaceHostPort?.resolveResource?.bind(workspaceHostPort),
    });
    const installedRecords = installedExtensionRecords;
    const baseExtensionsConfig =
      extensionsConfig ??
      ({
        enabled: hostAvailableExtensions.map(({ manifest }) => manifest.id),
        recommendations: [],
      } satisfies WorkbenchExtensionsConfig);
    const resolvedAvailableExtensions =
      availableExtensions === undefined
        ? resolveInstalledAvailableExtensions(
            hostAvailableExtensions,
            installedRecords,
            baseExtensionsConfig.enabled,
          )
        : hostAvailableExtensions;
    const config = mergeExtensionsConfigWithInstallState(baseExtensionsConfig, installedRecords);
    const resolution = resolveWorkbenchExtensions(config, resolvedAvailableExtensions);
    const integrity = verifyWorkbenchExtensionsAgainstLock(
      resolution.enabledExtensions,
      extensionsLock,
      extensionIntegrityMode,
    );
    if (integrity.diagnostics.length > 0 && typeof console !== 'undefined') {
      for (const diagnostic of integrity.diagnostics) {
        console.warn(`[workbench-kit] ${diagnostic.message}`);
      }
    }
    const extensionRegistrations = extensionRegistry.registerExtensions(integrity.accepted);
    const availableIntegrity = verifyWorkbenchExtensionsAgainstLock(
      resolvedAvailableExtensions,
      extensionsLock,
      extensionIntegrityMode,
    );
    const extensionEnablement = new ExtensionEnablementController({
      availableExtensions: resolvedAvailableExtensions,
      initialEnabledExtensions: integrity.accepted,
      initialInstalledRecords: installedRecords,
      installedExtensionsStorage,
      installedExtensionsStorageKey,
      integrityAcceptedExtensionIds: new Set(
        availableIntegrity.accepted.map((description) => description.manifest.id),
      ),
      onPersistenceDiagnostic: (diagnostic) =>
        reportPersistenceDiagnostic(diagnostic, diagnosticHandlerRef),
      registrationLifetime: extensionRegistrations,
      registry: extensionRegistry,
    });
    const hostThemeDisposables = registerHostWorkbenchThemes(extensionRegistry.themes, hostThemes);
    const editorServiceCapabilityDisposable = extensionRegistry.capabilityRegistry.register({
      id: WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID,
      get: () => editorService,
    });
    const workspaceHostCapabilityDisposable =
      workspaceHostPort?.capabilityId && workspaceHostPort.service !== undefined
        ? extensionRegistry.capabilityRegistry.register({
            id: workspaceHostPort.capabilityId,
            get: () => workspaceHostPort.service,
            dispose: workspaceHostPort.dispose,
          })
        : undefined;
    const saveCommandDisposable = workspaceHostPort
      ? registerEditorSaveCommand(extensionRegistry.commands, {
          editorSavePort: workspaceHostPort,
          editorService,
        })
      : undefined;
    const userCommandDisposables = registerWorkbenchUserCommands(extensionRegistry, userCommands);
    const preferenceService = new PreferenceService({
      contributionDefaults: collectConfigurationDefaults(
        extensionRegistry.configurations.getConfigurations(),
      ),
      initialValuesByScope: {
        local: resolvedInitialLocalPreferences,
        workspace: initialWorkspaceSettings ?? {},
      },
    });
    let startupActivation: Promise<readonly { readonly extensionId: string }[]> | undefined;
    const ensureStartupActivation = () => {
      startupActivation ??= extensionRegistry.activateStartup();
      return startupActivation;
    };

    return {
      activateStartup: () => {
        void ensureStartupActivation();
      },
      availableExtensions: resolvedAvailableExtensions,
      dispose: () => {
        saveCommandDisposable?.dispose();
        userCommandDisposables.dispose();
        editorServiceCapabilityDisposable.dispose();
        workspaceHostCapabilityDisposable?.dispose();
        hostThemeDisposables.dispose();
        extensionEnablement.dispose();
        if (!workspaceHostCapabilityDisposable) {
          workspaceHostPort?.dispose?.();
        }
        editorService.dispose();
        for (const disposable of editorDocumentViewProviderDisposables) {
          disposable.dispose();
        }
        for (const disposable of viewHostFactoryDisposables) {
          disposable.dispose();
        }
        extensionRegistry.dispose();
        layoutService.dispose();
        preferenceService.dispose();
      },
      editorDocumentViewProviders,
      editorService,
      extensionEnablement,
      extensionRegistry,
      layoutService,
      missingExtensionIds: [
        ...resolution.missingExtensionIds,
        ...integrity.rejected.map((extension) => extension.manifest.id),
      ],
      preferenceService,
      waitForExtensionStartup: () => ensureStartupActivation().then(() => undefined),
      workspaceHostPort,
    };
  }, [
    availableExtensions,
    documentViewProviders,
    extensionIntegrityMode,
    extensionsLock,
    hostAvailableExtensions,
    extensionsConfig,
    hostThemes,
    includeDefaultDocumentViewProviders,
    initialWorkspaceSettings,
    installedExtensionsStorage,
    installedExtensionsStorageKey,
    installedExtensionRecords,
    resolvedInitialEditorState,
    resolvedInitialLayout,
    resolvedInitialLocalPreferences,
    userCommands,
    viewHostFactories,
    workspaceHostPort,
    diagnosticHandlerRef,
  ]);

  useEffect(() => {
    if (!shouldPersistLayout) {
      return undefined;
    }

    const disposable = services.layoutService.onDidChangeLayout(({ state, transient }) => {
      if (transient) {
        return;
      }

      reportPersistenceWriteResult(
        writePersistedWorkbenchLayoutResult(state, layoutStorageKey, layoutStorage),
        diagnosticHandlerRef,
      );
    });

    return () => {
      disposable.dispose();
    };
  }, [
    diagnosticHandlerRef,
    layoutStorage,
    layoutStorageKey,
    services.layoutService,
    shouldPersistLayout,
  ]);

  useEffect(() => {
    if (!shouldPersistEditorState) {
      return undefined;
    }

    const disposable = services.editorService.onDidChangeEditors(({ state }) => {
      reportPersistenceWriteResult(
        writePersistedEditorStateResult(state, editorStateStorageKey, editorStateStorage),
        diagnosticHandlerRef,
      );
    });

    return () => {
      disposable.dispose();
    };
  }, [
    diagnosticHandlerRef,
    editorStateStorage,
    editorStateStorageKey,
    services.editorService,
    shouldPersistEditorState,
  ]);

  useEffect(() => {
    if (!shouldPersistLocalPreferences) {
      return undefined;
    }

    const disposable = services.preferenceService.onDidChangePreference((event) => {
      if (event.scope !== 'local') {
        return;
      }

      reportPersistenceWriteResult(
        writePersistedLocalPreferencesResult(
          services.preferenceService.getScopedValues('local'),
          localPreferenceStorageKey,
          localPreferenceStorage,
        ),
        diagnosticHandlerRef,
      );
    });

    return () => {
      disposable.dispose();
    };
  }, [
    diagnosticHandlerRef,
    localPreferenceStorage,
    localPreferenceStorageKey,
    services.preferenceService,
    shouldPersistLocalPreferences,
  ]);

  useEffect(() => {
    const deferredDispose = deferredDisposeRef.current;
    if (deferredDispose?.services === services) {
      clearTimeout(deferredDispose.timeout);
      deferredDisposeRef.current = undefined;
    }

    services.activateStartup();

    return () => {
      const timeout = setTimeout(() => {
        if (deferredDisposeRef.current?.services === services) {
          deferredDisposeRef.current = undefined;
        }
        services.dispose();
      }, 0);

      deferredDisposeRef.current = { services, timeout };
    };
  }, [services]);

  const value = useMemo<WorkbenchContextValue>(
    () => ({
      activateCommand: (commandId) => services.extensionRegistry.activateCommand(commandId),
      activities: services.extensionRegistry.activities,
      availableExtensions: services.availableExtensions,
      commands: services.extensionRegistry.commands,
      configurations: services.extensionRegistry.configurations,
      contextKeyService,
      editorDocumentViewProviders: services.editorDocumentViewProviders,
      editorService: services.editorService,
      executeCommand: async (commandId, ...args) => {
        const result = await services.extensionRegistry.executeCommand(commandId, ...args);
        await runExplorerHostCommandSideEffects(commandId, args, result, {
          focusExplorerView: () => {
            services.layoutService.setActiveViewContainer(BUILTIN_EXPLORER_VIEW_CONTAINER_ID);
            services.layoutService.setSideBarVisible(true);
          },
          revealPath: publishExplorerRevealRequest,
        });
        if (commandId === BUILTIN_EXTENSIONS_FOCUS_COMMAND_ID) {
          services.layoutService.setActiveViewContainer(BUILTIN_EXTENSIONS_VIEW_CONTAINER_ID);
          services.layoutService.setSideBarVisible(true);
        }
        return result;
      },
      extensionActivation: createWorkbenchExtensionActivationAccess(
        services.extensionRegistry,
        services.waitForExtensionStartup,
      ),
      extensionActivationState: createWorkbenchExtensionActivationStateReader(
        services.extensionRegistry,
      ),
      extensionCatalog: createWorkbenchExtensionCatalogReader(services.extensionRegistry),
      installedExtensionsStorage,
      installedExtensionsStorageKey,
      keybindings: services.extensionRegistry.keybindings,
      keybindingOverrides,
      layoutService: services.layoutService,
      localizations: services.extensionRegistry.localizations,
      menus: services.extensionRegistry.menus,
      missingExtensionIds: services.missingExtensionIds,
      preferenceService: services.preferenceService,
      resetCommandKeybindingOverride,
      setCommandKeybindingOverride,
      settingsCapabilityPublisher: createWorkbenchSettingsCapabilityPublisher(
        services.extensionRegistry.capabilityRegistry,
      ),
      statusBar: services.extensionRegistry.statusBar,
      themes: services.extensionRegistry.themes,
      viewHostFactories: services.extensionRegistry.viewHostFactories,
      views: services.extensionRegistry.views,
      waitForExtensionStartup: services.waitForExtensionStartup,
      workspaceHostPort: services.workspaceHostPort,
    }),
    [
      contextKeyService,
      installedExtensionsStorage,
      installedExtensionsStorageKey,
      keybindingOverrides,
      resetCommandKeybindingOverride,
      services,
      setCommandKeybindingOverride,
    ],
  );

  return (
    <WorkbenchPersistenceDiagnosticContext.Provider value={onPersistenceDiagnostic}>
      <WorkbenchContext.Provider value={value}>
        <ExtensionEnablementContext.Provider value={services.extensionEnablement}>
          <EditorWorkspaceReconciler />
          {children}
        </ExtensionEnablementContext.Provider>
      </WorkbenchContext.Provider>
    </WorkbenchPersistenceDiagnosticContext.Provider>
  );
}

export function useWorkbench(): WorkbenchContextValue {
  const value = useContext(WorkbenchContext);
  if (!value) {
    throw new Error('useWorkbench must be used inside WorkbenchProvider.');
  }

  return value;
}
