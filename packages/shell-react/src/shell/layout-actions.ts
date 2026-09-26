import type { LayoutService } from '@workbench-kit/workbench-core';

/** User initiated shell layout transitions, evaluated against the current service state. */
export function createWorkbenchShellLayoutActions(layoutService: LayoutService) {
  return {
    focusActivity(activityId: string): void {
      layoutService.focusSideBarViewContainer(activityId);
    },
    showActivity(activityId: string): void {
      layoutService.update({
        sideBar: {
          activeViewContainer: activityId,
          visible: true,
        },
      });
    },
    toggleAuxiliarySidebar(): void {
      layoutService.setAuxiliaryBarVisible(!layoutService.getState().auxiliaryBar.visible);
    },
    toggleFocusMode(): void {
      layoutService.setFocusModeActive(!layoutService.isFocusModeActive());
    },
    togglePanel(): void {
      layoutService.setPanelVisible(!layoutService.getState().panel.visible);
    },
    togglePrimarySidebar(): void {
      layoutService.setSideBarVisible(!layoutService.getState().sideBar.visible);
    },
  };
}
