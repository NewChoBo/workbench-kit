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
    visible?: boolean;
  };
  auxiliarySidebar?: {
    isVisible: boolean;
    node: ReactNode;
    className?: string;
    style?: CSSProperties;
  };
  bottomPanel?: {
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
  bottomPanel,
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
  const { visible: isActivityBarVisible = true, ...activityBarProps } = activityBar;

  const primarySidebarSizePercent =
    primarySidebar?.onSizePercentChange !== undefined
      ? (primarySidebar.primarySizePercent ?? DEFAULT_PRIMARY_SIDEBAR_SIZE_PERCENT)
      : undefined;

  const isPrimarySidebarCollapsed = primarySidebar !== undefined && !primarySidebar.isVisible;
  const isBottomPanelCollapsed = bottomPanel !== undefined && !bottomPanel.isVisible;
  const isAuxiliarySidebarCollapsed = auxiliarySidebar !== undefined && !auxiliarySidebar.isVisible;

  useEffect(() => {
    if (primarySidebar === undefined) {
      return;
    }

    sidebarDevLogger.info('primary sidebar visibility', {
      isVisible: primarySidebar.isVisible,
    });
  }, [primarySidebar?.isVisible]);

  const editorArea = bottomPanel ? (
    <SplitView
      className={cx(
        bottomPanel.className,
        isBottomPanelCollapsed && 'ui-workbench-split-view--secondary-collapsed',
      )}
      defaultPrimarySizePercent={70}
      maxPrimarySizePercent={90}
      minPrimarySizePercent={30}
      orientation="vertical"
      primary={secondaryArea}
      secondary={bottomPanel.node}
    />
  ) : (
    secondaryArea
  );

  const centerArea =
    auxiliarySidebar !== undefined ? (
      <SplitView
        className={cx(
          auxiliarySidebar.className,
          isAuxiliarySidebarCollapsed && 'ui-workbench-split-view--secondary-collapsed',
        )}
        defaultPrimarySizePercent={75}
        maxPrimarySizePercent={90}
        minPrimarySizePercent={50}
        primary={editorArea}
        secondary={auxiliarySidebar.node}
      />
    ) : (
      editorArea
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
      <div className={cx('ide-body', !isActivityBarVisible && 'ide-body--activity-bar-hidden')}>
        <ActivityBar
          {...activityBarProps}
          className={cx(
            activityBarProps.className,
            !isActivityBarVisible && 'ui-workbench-activity-bar--hidden',
          )}
        />
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
