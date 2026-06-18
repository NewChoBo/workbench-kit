import type { CSSProperties, ReactNode } from 'react';
import { ActivityBar, type ActivityBarProps, type ActivityBarItem } from './ActivityBar';
import { SplitView } from './SplitView';
import { StatusBar, type StatusBarItemModel, type StatusBarSectionModel } from './StatusBar';
import { DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT } from './shellState';
import { suppressNativeBrowserContextMenu } from './workbenchContextMenu';

export interface WorkbenchShellProps {
  activityBar: Omit<ActivityBarProps, 'items'> & {
    items: ActivityBarItem[];
  };
  compactStatus?: boolean;
  onStatusItemActivate?: (item: StatusBarItemModel) => void;
  primarySidebar?: {
    isVisible: boolean;
    node: ReactNode;
    onSizePercentChange?: (sizePercent: number) => void;
    primarySizePercent?: number;
    minPrimarySizePercent?: number;
    maxPrimarySizePercent?: number;
    className?: string;
    style?: CSSProperties;
  };
  rootClassName?: string;
  rootStyle?: CSSProperties;
  secondaryArea: ReactNode;
  statusSections: StatusBarSectionModel[];
  titleBar?: ReactNode;
  overlays?: ReactNode;
  theme?: string;
}

export function WorkbenchShell({
  activityBar,
  compactStatus = true,
  onStatusItemActivate,
  overlays,
  primarySidebar,
  rootClassName,
  rootStyle,
  secondaryArea,
  statusSections,
  titleBar,
  theme,
}: WorkbenchShellProps) {
  const body = primarySidebar?.isVisible ? (
    <SplitView
      className={primarySidebar?.className}
      minPrimarySizePercent={primarySidebar?.minPrimarySizePercent}
      maxPrimarySizePercent={primarySidebar?.maxPrimarySizePercent}
      onPrimarySizePercentChange={primarySidebar?.onSizePercentChange}
      primary={primarySidebar.node}
      primarySizePercent={primarySidebar.primarySizePercent ?? DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT}
      secondary={secondaryArea}
    />
  ) : (
    secondaryArea
  );

  return (
    <div
      className={rootClassName}
      data-theme={theme}
      style={rootStyle}
      onContextMenu={suppressNativeBrowserContextMenu}
    >
      {titleBar ? <header className="ui-workbench-titlebar">{titleBar}</header> : null}
      <div className="ide-body">
        <ActivityBar {...activityBar} />
        {body}
      </div>
      <StatusBar
        compact={compactStatus}
        sections={statusSections}
        onItemActivate={onStatusItemActivate}
      />
      {overlays}
    </div>
  );
}
