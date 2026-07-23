import '../chrome/workbench-shell-titlebar.css';
import type { JSX } from 'react';

import { IconButton } from '../../primitives/icon-button';

export interface WorkbenchShellTitleBarLayoutControlsProps {
  readonly isAuxiliarySidebarVisible?: boolean | undefined;
  readonly isPanelVisible?: boolean | undefined;
  readonly isPrimarySidebarVisible: boolean;
  readonly onToggleAuxiliarySidebar?: (() => void) | undefined;
  readonly onTogglePanel?: (() => void) | undefined;
  readonly onTogglePrimarySidebar: () => void;
  readonly panelHideLabel?: string | undefined;
  readonly panelShowLabel?: string | undefined;
  readonly primarySidebarHideLabel?: string | undefined;
  readonly primarySidebarShowLabel?: string | undefined;
  readonly secondarySidebarHideLabel?: string | undefined;
  readonly secondarySidebarShowLabel?: string | undefined;
}

function joinClasses(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export function WorkbenchShellTitleBarLayoutControls({
  isAuxiliarySidebarVisible = false,
  isPanelVisible = false,
  isPrimarySidebarVisible,
  onToggleAuxiliarySidebar,
  onTogglePanel,
  onTogglePrimarySidebar,
  panelHideLabel = 'Hide Panel',
  panelShowLabel = 'Show Panel',
  primarySidebarHideLabel = 'Hide Primary Side Bar',
  primarySidebarShowLabel = 'Show Primary Side Bar',
  secondarySidebarHideLabel = 'Hide Secondary Side Bar',
  secondarySidebarShowLabel = 'Show Secondary Side Bar',
}: WorkbenchShellTitleBarLayoutControlsProps): JSX.Element {
  return (
    <div className="workbench-shell-titlebar__layout-controls">
      <IconButton
        aria-pressed={isPrimarySidebarVisible}
        className={joinClasses(
          'workbench-shell-titlebar__layout-control',
          isPrimarySidebarVisible && 'workbench-shell-titlebar__layout-control--active',
        )}
        compact
        icon="codicon-layout-sidebar-left"
        label={isPrimarySidebarVisible ? primarySidebarHideLabel : primarySidebarShowLabel}
        onClick={onTogglePrimarySidebar}
      />
      {onTogglePanel ? (
        <IconButton
          aria-pressed={isPanelVisible}
          className={joinClasses(
            'workbench-shell-titlebar__layout-control',
            isPanelVisible && 'workbench-shell-titlebar__layout-control--active',
          )}
          compact
          icon="codicon-layout-panel"
          label={isPanelVisible ? panelHideLabel : panelShowLabel}
          onClick={onTogglePanel}
        />
      ) : null}
      {onToggleAuxiliarySidebar ? (
        <IconButton
          aria-pressed={isAuxiliarySidebarVisible}
          className={joinClasses(
            'workbench-shell-titlebar__layout-control',
            isAuxiliarySidebarVisible && 'workbench-shell-titlebar__layout-control--active',
          )}
          compact
          icon="codicon-layout-sidebar-right"
          label={isAuxiliarySidebarVisible ? secondarySidebarHideLabel : secondarySidebarShowLabel}
          onClick={onToggleAuxiliarySidebar}
        />
      ) : null}
    </div>
  );
}
