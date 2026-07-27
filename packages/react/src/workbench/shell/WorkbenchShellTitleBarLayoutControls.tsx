import '../chrome/workbench-shell-titlebar.css';
import type { JSX } from 'react';

import { IconButton } from '../../primitives/icon-button';
import { cx } from '../../utils/cx';

export interface WorkbenchShellTitleBarLayoutControlsProps {
  readonly isAuxiliarySidebarVisible?: boolean;
  readonly isPanelVisible?: boolean;
  readonly isPrimarySidebarVisible: boolean;
  readonly onToggleAuxiliarySidebar?: () => void;
  readonly onTogglePanel?: () => void;
  readonly onTogglePrimarySidebar: () => void;
  readonly panelHideLabel?: string;
  readonly panelShowLabel?: string;
  readonly primarySidebarHideLabel?: string;
  readonly primarySidebarShowLabel?: string;
  readonly secondarySidebarHideLabel?: string;
  readonly secondarySidebarShowLabel?: string;
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
        className={cx(
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
          className={cx(
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
          className={cx(
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
