import { useSyncExternalStore } from 'react';

import {
  collectWorkbenchDevtoolsSnapshot,
  type WorkbenchDevtoolsSnapshot,
} from './workbench-devtools-snapshot.js';
import { useWorkbench } from '../provider.js';
import type { WorkbenchWorkspaceHostPort as WorkspaceHostPort } from '@workbench-kit/workspace';

export function useWorkbenchDevtoolsSnapshot(): WorkbenchDevtoolsSnapshot {
  const { editorService, extensionRegistry, layoutService, workspaceHostPort } = useWorkbench();

  return useSyncExternalStore(
    (onStoreChange) => {
      const disposables = [
        layoutService.onDidChangeLayout(() => {
          onStoreChange();
        }),
        editorService.onDidChangeEditors(() => {
          onStoreChange();
        }),
        extensionRegistry.commands.onDidRegisterCommand(() => {
          onStoreChange();
        }),
        extensionRegistry.views.onDidRegisterView(() => {
          onStoreChange();
        }),
        extensionRegistry.views.onDidRegisterViewContainer(() => {
          onStoreChange();
        }),
        extensionRegistry.views.onDidRegisterViewProvider(() => {
          onStoreChange();
        }),
        extensionRegistry.activities.onDidRegisterActivity(() => {
          onStoreChange();
        }),
      ];

      const workspacePort = workspaceHostPort as WorkspaceHostPort | undefined;
      const unsubscribeWorkspace = workspacePort?.service.onDidChangeWorkspace(() => {
        onStoreChange();
      });

      return () => {
        for (const disposable of disposables) {
          disposable.dispose();
        }

        unsubscribeWorkspace?.();
      };
    },
    () =>
      collectWorkbenchDevtoolsSnapshot({
        editorService,
        extensionRegistry,
        layoutService,
        workspaceHostPort,
      }),
    () =>
      collectWorkbenchDevtoolsSnapshot({
        editorService,
        extensionRegistry,
        layoutService,
        workspaceHostPort,
      }),
  );
}
