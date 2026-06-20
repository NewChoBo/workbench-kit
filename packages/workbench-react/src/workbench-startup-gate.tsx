import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  WorkbenchBootstrapGate,
  useWorkbenchBootstrap,
  type WorkbenchBootstrapTaskDefinition,
} from '@workbench-kit/react/workbench/bootstrap';
import type { VirtualWorkspaceInitialState } from '@workbench-kit/workspace';
import { useWorkbench } from './provider.js';

export interface WorkbenchStartupGateProps {
  children: ReactNode;
  className?: string | undefined;
  footer?: ReactNode;
  heading?: string | undefined;
  onFailed?: ((error: Error) => void) | undefined;
  onReady?: (() => void) | undefined;
  renderBootstrap?:
    | ((bootstrap: ReturnType<typeof useWorkbenchBootstrap>) => ReactNode)
    | undefined;
  subtitle?: string | undefined;
  tasks?: readonly WorkbenchBootstrapTaskDefinition[] | undefined;
  workspaceInit?: VirtualWorkspaceInitialState | undefined;
}

function countWorkspaceEntries(
  workspaceInit: VirtualWorkspaceInitialState | undefined,
): string | undefined {
  if (!workspaceInit) {
    return undefined;
  }

  const fileCount = workspaceInit.files?.length ?? 0;
  const folderCount = workspaceInit.folders?.length ?? 0;
  const parts: string[] = [];

  if (fileCount > 0) {
    parts.push(`${fileCount} file${fileCount === 1 ? '' : 's'}`);
  }

  if (folderCount > 0) {
    parts.push(`${folderCount} folder${folderCount === 1 ? '' : 's'}`);
  }

  return parts.length > 0 ? parts.join(', ') : undefined;
}

export function WorkbenchStartupGate({
  children,
  className,
  footer,
  heading = 'Preparing workbench',
  onFailed,
  onReady,
  renderBootstrap,
  subtitle = 'Loading extensions and preparing your workspace.',
  tasks,
  workspaceInit,
}: WorkbenchStartupGateProps) {
  const { executeCommand, missingExtensionIds, waitForExtensionStartup } = useWorkbench();
  const bootstrap = useWorkbenchBootstrap();
  const startedRef = useRef(false);
  const workspaceDetail = countWorkspaceEntries(workspaceInit);

  const startupTasks = useMemo<readonly WorkbenchBootstrapTaskDefinition[]>(() => {
    if (tasks) {
      return tasks;
    }

    const resolvedTasks: WorkbenchBootstrapTaskDefinition[] = [
      {
        detail:
          missingExtensionIds.length > 0 ? `${missingExtensionIds.length} missing` : undefined,
        id: 'extensions',
        label: 'Loading extensions',
        run: async () => {
          await waitForExtensionStartup();
        },
      },
    ];

    if (workspaceInit) {
      resolvedTasks.push({
        detail: workspaceDetail,
        id: 'workspace',
        label: 'Preparing workspace',
        run: async () => {
          await executeCommand('workspace.init', workspaceInit);
        },
      });
    }

    return resolvedTasks;
  }, [
    executeCommand,
    missingExtensionIds.length,
    tasks,
    waitForExtensionStartup,
    workspaceDetail,
    workspaceInit,
  ]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    void bootstrap.run(startupTasks).catch((error: unknown) => {
      onFailed?.(error instanceof Error ? error : new Error('Startup failed.'));
    });
  }, [bootstrap, onFailed, startupTasks]);

  useEffect(() => {
    if (bootstrap.isReady) {
      onReady?.();
    }
  }, [bootstrap.isReady, onReady]);

  useEffect(() => {
    if (bootstrap.status === 'failed' && bootstrap.error) {
      onFailed?.(new Error(bootstrap.error));
    }
  }, [bootstrap.error, bootstrap.status, onFailed]);

  return (
    <WorkbenchBootstrapGate
      bootstrap={bootstrap}
      className={className}
      footer={footer}
      heading={heading}
      renderBootstrap={renderBootstrap}
      subtitle={subtitle}
    >
      {children}
    </WorkbenchBootstrapGate>
  );
}
