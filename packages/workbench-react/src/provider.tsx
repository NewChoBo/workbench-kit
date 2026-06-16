import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import {
  BUILTIN_WORKBENCH_EXTENSIONS,
  createEditorService,
  ExtensionRegistry,
  LayoutService,
  registerEditorSaveCommand,
  resolveWorkbenchExtensions,
  type EditorService,
  type WorkbenchEditorSavePort,
  type WorkbenchExtensionDescription,
  type WorkbenchLayoutStateInput,
} from '@workbench-kit/workbench-core';
import type { WorkbenchExtensionsConfig } from '@workbench-kit/workbench-config';

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
  workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

export interface WorkbenchContextValue {
  activateCommand(commandId: string): Promise<readonly { readonly extensionId: string }[]>;
  editorService: EditorService;
  executeCommand(commandId: string, ...args: unknown[]): Promise<unknown>;
  extensionRegistry: ExtensionRegistry;
  layoutService: LayoutService;
  missingExtensionIds: readonly string[];
  workspaceHostPort?: WorkbenchWorkspaceHostPort | undefined;
}

const WorkbenchContext = createContext<WorkbenchContextValue | undefined>(undefined);

export function WorkbenchProvider({
  availableExtensions = BUILTIN_WORKBENCH_EXTENSIONS,
  children,
  extensionsConfig,
  initialLayout,
  workspaceHostPort,
}: WorkbenchProviderProps) {
  const services = useMemo(() => {
    const extensionRegistry = new ExtensionRegistry();
    const layoutService = new LayoutService(initialLayout);
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
    const hostDisposables =
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

    return {
      dispose: () => {
        saveCommandDisposable?.dispose();
        hostDisposables?.dispose();
        extensionDisposables.dispose();
        if (!hostDisposables) {
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
      workspaceHostPort,
    };
  }, [availableExtensions, extensionsConfig, initialLayout, workspaceHostPort]);

  useEffect(() => {
    void services.extensionRegistry.activateStartup();

    return () => {
      services.dispose();
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
