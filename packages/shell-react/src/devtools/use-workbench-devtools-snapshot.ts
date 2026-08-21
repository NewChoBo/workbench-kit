import { useMemo, useSyncExternalStore } from 'react';

import {
  collectWorkbenchDevtoolsSnapshot,
  type WorkbenchDevtoolsSnapshot,
} from './workbench-devtools-snapshot.js';
import { useWorkbench } from '../shell/provider.js';
import type { WorkbenchWorkspaceHostPort as WorkspaceHostPort } from '@workbench-kit/workspace';

export function useWorkbenchDevtoolsSnapshot(): WorkbenchDevtoolsSnapshot {
  const {
    activities,
    commands,
    editorService,
    extensionActivationState,
    extensionCatalog,
    keybindings,
    layoutService,
    menus,
    views,
    workspaceHostPort,
  } = useWorkbench();

  const store = useMemo(() => {
    const collectSnapshot = () =>
      collectWorkbenchDevtoolsSnapshot({
        activities,
        commands,
        editorService,
        extensionActivationState,
        extensionCatalog,
        keybindings,
        layoutService,
        menus,
        views,
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
          commands.onDidChangeCommands(() => {
            notifyChange(onStoreChange);
          }),
          menus.onDidRegisterMenuItem(() => {
            notifyChange(onStoreChange);
          }),
          keybindings.onDidRegisterKeybinding(() => {
            notifyChange(onStoreChange);
          }),
          views.onDidRegisterView(() => {
            notifyChange(onStoreChange);
          }),
          views.onDidRegisterViewContainer(() => {
            notifyChange(onStoreChange);
          }),
          views.onDidRegisterViewProvider(() => {
            notifyChange(onStoreChange);
          }),
          activities.onDidRegisterActivity(() => {
            notifyChange(onStoreChange);
          }),
          extensionActivationState.onDidChangeActiveExtensions(() => {
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
  }, [
    activities,
    commands,
    editorService,
    extensionActivationState,
    extensionCatalog,
    keybindings,
    layoutService,
    menus,
    views,
    workspaceHostPort,
  ]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
