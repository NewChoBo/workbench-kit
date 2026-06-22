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
  BUILTIN_WORKBENCH_EXTENSIONS,
  collectConfigurationDefaults,
  createEditorService,
  ExtensionRegistry,
  LayoutService,
  loadInstalledExtensions,
  mergeExtensionsConfigWithInstallState,
  PreferenceService,
  registerEditorSaveCommand,
  resolveInstalledAvailableExtensions,
  resolveWorkbenchExtensions,
  SAMPLE_WORKBENCH_EXTENSIONS,
  DEFAULT_INSTALLED_EXTENSIONS_STORAGE_KEY,
  WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID,
  type EditorState,
  type EditorService,
  type PreferenceService as PreferenceServiceType,
  type WorkbenchEditorSavePort,
  type WorkbenchExtensionDescription,
  type WorkbenchLayoutStateInput,
} from '@workbench-kit/workbench-core';
import {
  ContextKeyService,
  createWorkbenchPermissionContextKeys,
  type ContextKeyValue,
} from '@workbench-kit/platform';
import type {
  WorkbenchExtensionsConfig,
  WorkbenchKeybindingDefinition,
  WorkbenchSettingsConfig,
  WorkbenchUserCommandDefinition,
} from '@workbench-kit/workbench-config';
import {
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  isWorkbenchLayoutPersistenceAvailable,
  resolvePersistedWorkbenchLayout,
  writePersistedWorkbenchLayout,
} from './workbench-layout-storage.js';
import {
  DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  isWorkbenchEditorStatePersistenceAvailable,
  readPersistedEditorState,
  writePersistedEditorState,
} from './editor-state-storage.js';
import {
  DEFAULT_WORKBENCH_KEYBINDING_STORAGE_KEY,
  isWorkbenchKeybindingPersistenceAvailable,
  readPersistedKeybindingOverrides,
  writePersistedKeybindingOverrides,
} from './keybinding-overrides-storage.js';
import {
  BUILTIN_EXPLORER_VIEW_CONTAINER_ID,
  publishExplorerRevealRequest,
  runExplorerHostCommandSideEffects,
} from './explorer-reveal.js';
import {
  BUILTIN_EXTENSIONS_FOCUS_COMMAND_ID,
  BUILTIN_EXTENSIONS_VIEW_CONTAINER_ID,
} from './extensions-view-data.js';
import {
  DEFAULT_WORKBENCH_LOCAL_PREFERENCE_STORAGE_KEY,
  isWorkbenchLocalPreferencePersistenceAvailable,
  readPersistedLocalPreferences,
  writePersistedLocalPreferences,
} from './preference-settings-storage.js';
import { registerWorkbenchUserCommands } from './workbench-user-commands.js';
import {
  DEFAULT_EDITOR_DOCUMENT_VIEW_PROVIDERS,
  type EditorDocumentViewProvider,
} from './editor-view-providers.js';
import type { EditorDocumentViewProviderRegistry } from '@workbench-kit/workbench-core';

export interface WorkbenchWorkspaceHostPort extends WorkbenchEditorSavePort {
  readonly capabilityId?: string | undefined;
  readonly service?: unknown;
  dispose?(): void;
}

export type WorkbenchStorageAdapter = Pick<Storage, 'getItem' | 'setItem'>;

const DEFAULT_AVAILABLE_EXTENSIONS = [
  ...BUILTIN_WORKBENCH_EXTENSIONS,
  ...SAMPLE_WORKBENCH_EXTENSIONS,
] as const;

export interface WorkbenchProviderProps {
  availableExtensions?: readonly WorkbenchExtensionDescription[];
  children: ReactNode;
  contextKeyValues?: Readonly<Record<string, ContextKeyValue>> | undefined;
  documentViewProviders?: readonly EditorDocumentViewProvider[] | undefined;
  extensionsConfig?: WorkbenchExtensionsConfig;
  editorStateStorage?: WorkbenchStorageAdapter;
  editorStateStorageKey?: string;
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
    | ((overrides: readonly WorkbenchKeybindingDefinition[]) => void)
    | undefined;
  persistEditorState?: boolean;
  persistKeybindingOverrides?: boolean;
  persistLayout?: boolean;
  persistLocalPreferences?: boolean;
  userCommands?: readonly WorkbenchUserCommandDefinition[];
  workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

export interface WorkbenchContextValue {
  activateCommand(commandId: string): Promise<readonly { readonly extensionId: string }[]>;
  contextKeyService: ContextKeyService;
  editorDocumentViewProviders: EditorDocumentViewProviderRegistry;
  editorService: EditorService;
  executeCommand(commandId: string, ...args: unknown[]): Promise<unknown>;
  extensionRegistry: ExtensionRegistry;
  installedExtensionsStorage?: WorkbenchStorageAdapter;
  installedExtensionsStorageKey: string;
  keybindingOverrides: readonly WorkbenchKeybindingDefinition[];
  layoutService: LayoutService;
  missingExtensionIds: readonly string[];
  preferenceService: PreferenceServiceType;
  resetCommandKeybindingOverride(commandId: string): void;
  setCommandKeybindingOverride(commandId: string, key: string): void;
  waitForExtensionStartup(): Promise<void>;
  workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

interface WorkbenchProviderServices {
  activateStartup(): void;
  dispose(): void;
  editorDocumentViewProviders: EditorDocumentViewProviderRegistry;
  editorService: EditorService;
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

const WorkbenchContext = createContext<WorkbenchContextValue | undefined>(undefined);

export function WorkbenchProvider({
  availableExtensions,
  children,
  contextKeyValues,
  documentViewProviders,
  editorStateStorage,
  editorStateStorageKey = DEFAULT_WORKBENCH_EDITOR_STATE_STORAGE_KEY,
  extensionsConfig,
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
  persistEditorState,
  persistKeybindingOverrides,
  persistLayout,
  persistLocalPreferences,
  userCommands = [],
  workspaceHostPort,
}: WorkbenchProviderProps) {
  const hostAvailableExtensions = availableExtensions ?? DEFAULT_AVAILABLE_EXTENSIONS;
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
  const resolvedInitialLayout = useMemo(
    () =>
      resolvePersistedWorkbenchLayout(initialLayout, {
        persistLayout: shouldPersistLayout,
        storage: layoutStorage,
        storageKey: layoutStorageKey,
      }),
    [initialLayout, layoutStorage, layoutStorageKey, shouldPersistLayout],
  );
  const resolvedInitialEditorState = useMemo(
    () =>
      initialEditorState ??
      (shouldPersistEditorState
        ? readPersistedEditorState(editorStateStorageKey, editorStateStorage)
        : undefined),
    [editorStateStorage, editorStateStorageKey, initialEditorState, shouldPersistEditorState],
  );
  const resolvedInitialKeybindingOverrides = useMemo(
    () =>
      initialKeybindingOverrides ??
      (shouldPersistKeybindingOverrides
        ? readPersistedKeybindingOverrides(
            keybindingOverridesStorageKey,
            keybindingOverridesStorage,
          )
        : []),
    [
      initialKeybindingOverrides,
      keybindingOverridesStorage,
      keybindingOverridesStorageKey,
      shouldPersistKeybindingOverrides,
    ],
  );
  const [keybindingOverrides, setKeybindingOverridesState] = useState(
    resolvedInitialKeybindingOverrides,
  );
  const contextKeyService = useMemo(() => {
    const service = new ContextKeyService();
    for (const [key, value] of Object.entries(
      createWorkbenchPermissionContextKeys({ role: 'admin' }),
    )) {
      service.set(key, value);
    }
    return service;
  }, []);

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
    setKeybindingOverridesState(resolvedInitialKeybindingOverrides);
  }, [resolvedInitialKeybindingOverrides]);

  const setCommandKeybindingOverride = useCallback((commandId: string, key: string) => {
    setKeybindingOverridesState((current) => {
      const without = current.filter((binding) => binding.command !== commandId);
      return [...without, { command: commandId, key }];
    });
  }, []);

  const resetCommandKeybindingOverride = useCallback((commandId: string) => {
    setKeybindingOverridesState((current) =>
      current.filter((binding) => binding.command !== commandId),
    );
  }, []);

  useEffect(() => {
    onKeybindingOverridesChange?.(keybindingOverrides);
    if (!shouldPersistKeybindingOverrides) {
      return;
    }

    writePersistedKeybindingOverrides(
      keybindingOverrides,
      keybindingOverridesStorageKey,
      keybindingOverridesStorage,
    );
  }, [
    keybindingOverrides,
    keybindingOverridesStorage,
    keybindingOverridesStorageKey,
    onKeybindingOverridesChange,
    shouldPersistKeybindingOverrides,
  ]);

  const resolvedInitialLocalPreferences = useMemo(
    () =>
      shouldPersistLocalPreferences
        ? readPersistedLocalPreferences(localPreferenceStorageKey, localPreferenceStorage)
        : {},
    [localPreferenceStorage, localPreferenceStorageKey, shouldPersistLocalPreferences],
  );

  const services = useMemo<WorkbenchProviderServices>(() => {
    const extensionRegistry = new ExtensionRegistry();
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
    const installedRecords = loadInstalledExtensions(
      installedExtensionsStorageKey,
      installedExtensionsStorage,
    );
    const resolvedAvailableExtensions =
      availableExtensions === undefined
        ? resolveInstalledAvailableExtensions(hostAvailableExtensions, installedRecords)
        : hostAvailableExtensions;
    const config = mergeExtensionsConfigWithInstallState(
      extensionsConfig ??
        ({
          enabled: resolvedAvailableExtensions.map(({ manifest }) => manifest.id),
          recommendations: [],
        } satisfies WorkbenchExtensionsConfig),
      installedRecords,
    );
    const resolution = resolveWorkbenchExtensions(config, resolvedAvailableExtensions);
    const extensionDisposables = extensionRegistry.registerExtensions(resolution.enabledExtensions);
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
      dispose: () => {
        saveCommandDisposable?.dispose();
        userCommandDisposables.dispose();
        editorServiceCapabilityDisposable.dispose();
        workspaceHostCapabilityDisposable?.dispose();
        extensionDisposables.dispose();
        if (!workspaceHostCapabilityDisposable) {
          workspaceHostPort?.dispose?.();
        }
        editorService.dispose();
        for (const disposable of editorDocumentViewProviderDisposables) {
          disposable.dispose();
        }
        extensionRegistry.dispose();
        layoutService.dispose();
        preferenceService.dispose();
      },
      editorDocumentViewProviders,
      editorService,
      extensionRegistry,
      layoutService,
      missingExtensionIds: resolution.missingExtensionIds,
      preferenceService,
      waitForExtensionStartup: () => ensureStartupActivation().then(() => undefined),
      workspaceHostPort,
    };
  }, [
    availableExtensions,
    documentViewProviders,
    hostAvailableExtensions,
    extensionsConfig,
    includeDefaultDocumentViewProviders,
    initialWorkspaceSettings,
    installedExtensionsStorage,
    installedExtensionsStorageKey,
    resolvedInitialEditorState,
    resolvedInitialLayout,
    resolvedInitialLocalPreferences,
    userCommands,
    workspaceHostPort,
  ]);

  useEffect(() => {
    if (!shouldPersistLayout) {
      return undefined;
    }

    const disposable = services.layoutService.onDidChangeLayout(({ state }) => {
      writePersistedWorkbenchLayout(state, layoutStorageKey, layoutStorage);
    });

    return () => {
      disposable.dispose();
    };
  }, [layoutStorage, layoutStorageKey, services.layoutService, shouldPersistLayout]);

  useEffect(() => {
    if (!shouldPersistEditorState) {
      return undefined;
    }

    const disposable = services.editorService.onDidChangeEditors(({ state }) => {
      writePersistedEditorState(state, editorStateStorageKey, editorStateStorage);
    });

    return () => {
      disposable.dispose();
    };
  }, [editorStateStorage, editorStateStorageKey, services.editorService, shouldPersistEditorState]);

  useEffect(() => {
    if (!shouldPersistLocalPreferences) {
      return undefined;
    }

    const disposable = services.preferenceService.onDidChangePreference((event) => {
      if (event.scope !== 'local') {
        return;
      }

      writePersistedLocalPreferences(
        services.preferenceService.getScopedValues('local'),
        localPreferenceStorageKey,
        localPreferenceStorage,
      );
    });

    return () => {
      disposable.dispose();
    };
  }, [
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
      extensionRegistry: services.extensionRegistry,
      installedExtensionsStorage,
      installedExtensionsStorageKey,
      keybindingOverrides,
      layoutService: services.layoutService,
      missingExtensionIds: services.missingExtensionIds,
      preferenceService: services.preferenceService,
      resetCommandKeybindingOverride,
      setCommandKeybindingOverride,
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

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

export function useWorkbench(): WorkbenchContextValue {
  const value = useContext(WorkbenchContext);
  if (!value) {
    throw new Error('useWorkbench must be used inside WorkbenchProvider.');
  }

  return value;
}
