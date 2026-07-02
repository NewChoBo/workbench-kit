import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../utils/cx';
import { ActivityBar, type ActivityBarProps, type ActivityBarItem } from './ActivityBar';
import { SplitView } from './SplitView';
import { sidebarDevLogger } from './sidebarDevLogger';
import { StatusBar, type StatusBarItemModel, type StatusBarSectionModel } from './StatusBar';
import { DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT } from './shellState';
import { suppressNativeBrowserContextMenu } from './workbenchContextMenu';

export interface WorkbenchShellProps {
  activityBar: Omit<ActivityBarProps, 'items'> & {
    items: ActivityBarItem[];
  };
  auxiliarySidebar?: {
    isVisible: boolean;
    node: ReactNode;
    className?: string;
    style?: CSSProperties;
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
  themePreference?: string;
  themePreset?: string;
}

export function WorkbenchShell({
  activityBar,
  auxiliarySidebar,
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
  themePreference,
  themePreset,
}: WorkbenchShellProps) {
  const primarySidebarSizePercent =
    primarySidebar?.onSizePercentChange !== undefined
      ? (primarySidebar.primarySizePercent ?? DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT)
      : undefined;

  const isPrimarySidebarCollapsed = primarySidebar !== undefined && !primarySidebar.isVisible;

  useEffect(() => {
    if (primarySidebar === undefined) {
      return;
    }

    sidebarDevLogger.info('primary sidebar visibility', {
      isVisible: primarySidebar.isVisible,
    });
  }, [primarySidebar?.isVisible]);

  const centerArea = auxiliarySidebar?.isVisible ? (
    <SplitView
      className={auxiliarySidebar.className}
      defaultPrimarySizePercent={75}
      maxPrimarySizePercent={90}
      minPrimarySizePercent={50}
      primary={secondaryArea}
      secondary={auxiliarySidebar.node}
    />
  ) : (
    secondaryArea
  );

  const body = primarySidebar ? (
    <SplitView
      className={cx(
        primarySidebar.className,
        isPrimarySidebarCollapsed && 'ui-workbench-split-view--primary-collapsed',
      )}
      defaultPrimarySizePercent={
        primarySidebar.primarySizePercent ?? DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT
      }
      minPrimarySizePercent={primarySidebar.minPrimarySizePercent}
      maxPrimarySizePercent={primarySidebar.maxPrimarySizePercent}
      onPrimarySizePercentChange={primarySidebar.onSizePercentChange}
      primary={primarySidebar.node}
      primarySizePercent={primarySidebarSizePercent}
      secondary={centerArea}
    />
  ) : (
    centerArea
  );

  return (
    <div
      className={rootClassName}
      data-theme={theme}
      data-theme-preference={themePreference}
      data-theme-preset={themePreset}
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
