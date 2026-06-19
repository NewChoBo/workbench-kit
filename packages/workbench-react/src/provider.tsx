import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  BUILTIN_WORKBENCH_EXTENSIONS,
  createEditorService,
  ExtensionRegistry,
  LayoutService,
  registerEditorSaveCommand,
  resolveWorkbenchExtensions,
  WORKBENCH_EDITOR_SERVICE_CAPABILITY_ID,
  type EditorService,
  type WorkbenchEditorSavePort,
  type WorkbenchExtensionDescription,
  type WorkbenchLayoutStateInput,
} from '@workbench-kit/workbench-core';
import type { WorkbenchExtensionsConfig } from '@workbench-kit/workbench-config';
import {
  DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  isWorkbenchLayoutPersistenceAvailable,
  resolvePersistedWorkbenchLayout,
  writePersistedWorkbenchLayout,
} from './workbench-layout-storage.js';

export interface WorkbenchWorkspaceHostPort extends WorkbenchEditorSavePort {
  readonly capabilityId?: string | undefined;
  readonly service?: unknown;
  dispose?(): void;
}

export interface WorkbenchProviderProps {
  availableExtensions?: readonly WorkbenchExtensionDescription[];
  children: ReactNode;
  extensionsConfig?: WorkbenchExtensionsConfig;
  initialLayout?: WorkbenchLayoutStateInput;
  layoutStorageKey?: string;
  persistLayout?: boolean;
  workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

export interface WorkbenchContextValue {
  activateCommand(commandId: string): Promise<readonly { readonly extensionId: string }[]>;
  editorService: EditorService;
  executeCommand(commandId: string, ...args: unknown[]): Promise<unknown>;
  extensionRegistry: ExtensionRegistry;
  layoutService: LayoutService;
  missingExtensionIds: readonly string[];
  waitForExtensionStartup(): Promise<void>;
  workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

interface WorkbenchProviderServices {
  activateStartup(): void;
  dispose(): void;
  editorService: EditorService;
  extensionRegistry: ExtensionRegistry;
  layoutService: LayoutService;
  missingExtensionIds: readonly string[];
  waitForExtensionStartup(): Promise<void>;
  workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

interface DeferredProviderDispose {
  readonly services: WorkbenchProviderServices;
  readonly timeout: ReturnType<typeof setTimeout>;
}

const WorkbenchContext = createContext<WorkbenchContextValue | undefined>(undefined);

export function WorkbenchProvider({
  availableExtensions = BUILTIN_WORKBENCH_EXTENSIONS,
  children,
  extensionsConfig,
  initialLayout,
  layoutStorageKey = DEFAULT_WORKBENCH_LAYOUT_STORAGE_KEY,
  persistLayout = isWorkbenchLayoutPersistenceAvailable(),
  workspaceHostPort,
}: WorkbenchProviderProps) {
  const deferredDisposeRef = useRef<DeferredProviderDispose | undefined>(undefined);
  const resolvedInitialLayout = useMemo(
    () =>
      resolvePersistedWorkbenchLayout(initialLayout, {
        persistLayout,
        storageKey: layoutStorageKey,
      }),
    [initialLayout, layoutStorageKey, persistLayout],
  );
  const services = useMemo<WorkbenchProviderServices>(() => {
    const extensionRegistry = new ExtensionRegistry();
    const layoutService = new LayoutService(resolvedInitialLayout);
    const editorService = createEditorService({
      editorHostFactories: extensionRegistry.editorHostFactories,
      editorResolvers: extensionRegistry.editorResolvers,
      resolveEditorResource: workspaceHostPort?.resolveResource?.bind(workspaceHostPort),
    });
    const config =
      extensionsConfig ??
      ({
        enabled: availableExtensions.map(({ manifest }) => manifest.id),
        recommendations: [],
      } satisfies WorkbenchExtensionsConfig);
    const resolution = resolveWorkbenchExtensions(config, availableExtensions);
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
        editorServiceCapabilityDisposable.dispose();
        workspaceHostCapabilityDisposable?.dispose();
        extensionDisposables.dispose();
        if (!workspaceHostCapabilityDisposable) {
          workspaceHostPort?.dispose?.();
        }
        editorService.dispose();
        extensionRegistry.dispose();
        layoutService.dispose();
      },
      editorService,
      extensionRegistry,
      layoutService,
      missingExtensionIds: resolution.missingExtensionIds,
      waitForExtensionStartup: () => ensureStartupActivation().then(() => undefined),
      workspaceHostPort,
    };
  }, [availableExtensions, extensionsConfig, resolvedInitialLayout, workspaceHostPort]);

  useEffect(() => {
    if (!persistLayout) {
      return undefined;
    }

    const disposable = services.layoutService.onDidChangeLayout(({ state }) => {
      writePersistedWorkbenchLayout(state, layoutStorageKey);
    });

    return () => {
      disposable.dispose();
    };
  }, [layoutStorageKey, persistLayout, services.layoutService]);

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
      editorService: services.editorService,
      executeCommand: (commandId, ...args) =>
        services.extensionRegistry.executeCommand(commandId, ...args),
      extensionRegistry: services.extensionRegistry,
      layoutService: services.layoutService,
      missingExtensionIds: services.missingExtensionIds,
      waitForExtensionStartup: services.waitForExtensionStartup,
      workspaceHostPort: services.workspaceHostPort,
    }),
    [services],
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
