import { useCallback, useSyncExternalStore } from 'react';
import { WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID } from '@workbench-kit/react/workbench/commands';

import { useWorkbench } from './provider.js';
import {
  WorkbenchShellTitleBarLayoutControls,
  type WorkbenchShellTitleBarLayoutControlsProps,
} from './titlebar-layout-controls.js';

export type WorkbenchHostPrimarySidebarToggleProps = Pick<
  WorkbenchShellTitleBarLayoutControlsProps,
  'primarySidebarHideLabel' | 'primarySidebarShowLabel'
>;

/** Provider-bound title-bar control; reflects canonical command handler and context enablement. */
export function WorkbenchHostPrimarySidebarToggle(props: WorkbenchHostPrimarySidebarToggleProps) {
  const { commands, contextKeyService, executeCommand, layoutService } = useWorkbench();
  const subscribeLayout = useCallback(
    (onStoreChange: () => void) => {
      const subscription = layoutService.onDidChangeLayout(onStoreChange);
      return () => subscription.dispose();
    },
    [layoutService],
  );
  const getSidebarVisible = useCallback(
    () => layoutService.getState().sideBar.visible,
    [layoutService],
  );
  const isPrimarySidebarVisible = useSyncExternalStore(
    subscribeLayout,
    getSidebarVisible,
    getSidebarVisible,
  );
  const subscribeCommands = useCallback(
    (onStoreChange: () => void) => {
      const commandsSubscription = commands.onDidChangeCommands(onStoreChange);
      const contextSubscription = contextKeyService.onDidChangeContext(onStoreChange);
      return () => {
        commandsSubscription.dispose();
        contextSubscription.dispose();
      };
    },
    [commands, contextKeyService],
  );
  const getCommandAvailable = useCallback(() => {
    const command = commands.getCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID);
    return Boolean(command?.handler && contextKeyService.evaluateWhen(command.enablement));
  }, [commands, contextKeyService]);
  const commandAvailable = useSyncExternalStore(
    subscribeCommands,
    getCommandAvailable,
    getCommandAvailable,
  );
  const onTogglePrimarySidebar = useCallback(() => {
    void executeCommand(WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID).catch(() => {
      console.error(
        `Workbench layout command failed: ${WORKBENCH_TOGGLE_PRIMARY_SIDEBAR_COMMAND_ID}`,
      );
    });
  }, [executeCommand]);

  return (
    <WorkbenchShellTitleBarLayoutControls
      {...props}
      isPrimarySidebarVisible={isPrimarySidebarVisible}
      onTogglePrimarySidebar={onTogglePrimarySidebar}
      primarySidebarDisabled={!commandAvailable}
    />
  );
}
