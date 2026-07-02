import { IconButton } from '@workbench-kit/react/primitives';

export interface WorkbenchShellTitleBarLayoutControlsProps {
  isAuxiliarySidebarVisible: boolean;
  isPanelVisible: boolean;
  isPrimarySidebarVisible: boolean;
  onToggleAuxiliarySidebar: () => void;
  onTogglePanel: () => void;
  onTogglePrimarySidebar: () => void;
}

export function WorkbenchShellTitleBarLayoutControls({
  isAuxiliarySidebarVisible,
  isPanelVisible,
  isPrimarySidebarVisible,
  onToggleAuxiliarySidebar,
  onTogglePanel,
  onTogglePrimarySidebar,
}: WorkbenchShellTitleBarLayoutControlsProps) {
  return (
    <div className="workbench-shell-titlebar__layout-controls">
      <IconButton
        aria-pressed={isPrimarySidebarVisible}
        className={[
          'workbench-shell-titlebar__layout-control',
          isPrimarySidebarVisible && 'workbench-shell-titlebar__layout-control--active',
        ]
          .filter(Boolean)
          .join(' ')}
        compact
        icon="codicon-layout-sidebar-left"
        label="Toggle Primary Side Bar"
        onClick={onTogglePrimarySidebar}
      />
      <IconButton
        aria-pressed={isPanelVisible}
        className={[
          'workbench-shell-titlebar__layout-control',
          isPanelVisible && 'workbench-shell-titlebar__layout-control--active',
        ]
          .filter(Boolean)
          .join(' ')}
        compact
        icon="codicon-layout-panel"
        label="Toggle Panel"
        onClick={onTogglePanel}
      />
      <IconButton
        aria-pressed={isAuxiliarySidebarVisible}
        className={[
          'workbench-shell-titlebar__layout-control',
          isAuxiliarySidebarVisible && 'workbench-shell-titlebar__layout-control--active',
        ]
          .filter(Boolean)
          .join(' ')}
        compact
        icon="codicon-layout-sidebar-right"
        label="Toggle Secondary Side Bar"
        onClick={onToggleAuxiliarySidebar}
      />
    </div>
  );
}
