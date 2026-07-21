import { useMemo, useSyncExternalStore } from 'react';

import {
  collectWorkbenchDevtoolsSnapshot,
  type WorkbenchDevtoolsSnapshot,
} from './workbench-devtools-snapshot.js';
import { useWorkbench } from '../provider.js';
import type { WorkbenchWorkspaceHostPort as WorkspaceHostPort } from '@workbench-kit/workspace';

export function useWorkbenchDevtoolsSnapshot(): WorkbenchDevtoolsSnapshot {
  const { editorService, extensionRegistry, layoutService, workspaceHostPort } = useWorkbench();

  const store = useMemo(() => {
    const collectSnapshot = () =>
      collectWorkbenchDevtoolsSnapshot({
        editorService,
        extensionRegistry,
        layoutService,
        workspaceHostPort,
      });
    let snapshot = collectSnapshot();

    const notifyChange = (onStoreChange: () => void) => {
      snapshot = collectSnapshot();
      onStoreChange();
    };

    return {
      getSnapshot: () => snapshot,
      subscribe: (onStoreChange: () => void) => {
        const disposables = [
          layoutService.onDidChangeLayout(() => {
            notifyChange(onStoreChange);
          }),
          editorService.onDidChangeEditors(() => {
            notifyChange(onStoreChange);
          }),
          extensionRegistry.commands.onDidRegisterCommand(() => {
            notifyChange(onStoreChange);
          }),
          extensionRegistry.menus.onDidRegisterMenuItem(() => {
            notifyChange(onStoreChange);
          }),
          extensionRegistry.keybindings.onDidRegisterKeybinding(() => {
            notifyChange(onStoreChange);
          }),
          extensionRegistry.views.onDidRegisterView(() => {
            notifyChange(onStoreChange);
          }),
          extensionRegistry.views.onDidRegisterViewContainer(() => {
            notifyChange(onStoreChange);
          }),
          extensionRegistry.views.onDidRegisterViewProvider(() => {
            notifyChange(onStoreChange);
          }),
          extensionRegistry.activities.onDidRegisterActivity(() => {
            notifyChange(onStoreChange);
          }),
          extensionRegistry.onDidActivateExtension(() => {
            notifyChange(onStoreChange);
          }),
          extensionRegistry.onDidDeactivateExtension(() => {
            notifyChange(onStoreChange);
          }),
        ];

        const workspacePort = workspaceHostPort as WorkspaceHostPort | undefined;
        const unsubscribeWorkspace = workspacePort?.service.onDidChangeWorkspace(() => {
          notifyChange(onStoreChange);
        });

        return () => {
          for (const disposable of disposables) {
            disposable.dispose();
          }

          unsubscribeWorkspace?.();
        };
      },
    };
  }, [editorService, extensionRegistry, layoutService, workspaceHostPort]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
