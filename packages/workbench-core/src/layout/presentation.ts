import type { WorkbenchLayoutState } from './service.js';

/** A visual mask over canonical layout state, never a persisted layout mode. */
export type WorkbenchFramePresentation = 'docked' | 'canvas';

export interface WorkbenchFrameVisibility {
  readonly activityBar: boolean;
  readonly sideBar: boolean;
  readonly auxiliaryBar: boolean;
  readonly panel: boolean;
  readonly statusBar: boolean;
}

/** Resolve frame chrome without changing layout, focus-mode snapshots, or storage. */
export function resolveWorkbenchFrameVisibility(
  layout: Readonly<WorkbenchLayoutState>,
  presentation: WorkbenchFramePresentation = 'docked',
): WorkbenchFrameVisibility {
  switch (presentation) {
    case 'docked':
      return {
        activityBar: layout.activityBar.visible,
        sideBar: layout.sideBar.visible,
        auxiliaryBar: layout.auxiliaryBar.visible,
        panel: layout.panel.visible,
        statusBar: true,
      };
    case 'canvas':
      return {
        activityBar: false,
        sideBar: false,
        auxiliaryBar: false,
        panel: false,
        statusBar: false,
      };
    default:
      throw new TypeError(`Unknown workbench frame presentation: ${String(presentation)}`);
  }
}
