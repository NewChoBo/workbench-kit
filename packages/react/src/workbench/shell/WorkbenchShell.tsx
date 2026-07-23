import { type CSSProperties, type ReactNode, useState } from 'react';
import '../chrome/workbench-layout-regions.css';
import { cx } from '../../utils/cx';
import { ActivityBar, type ActivityBarProps, type ActivityBarItem } from './ActivityBar';
import { SplitView } from './SplitView';
import { StatusBar, type StatusBarItemModel, type StatusBarSectionModel } from './StatusBar';
import { DEFAULT_PRIMARY_SIDEBAR_SIZE_PX } from './shellState';
import { suppressNativeBrowserContextMenu } from '../commands/workbenchContextMenu';
import { WorkbenchOverlaysProvider } from '../chrome/workbenchOverlaysContext';

export type WorkbenchShellActivityBarPosition = 'left' | 'top';

export interface WorkbenchShellProps {
  activityBar: Omit<ActivityBarProps, 'items'> & {
    items: ActivityBarItem[];
    visible?: boolean;
  };
  activityBarPosition?: WorkbenchShellActivityBarPosition;
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
    onSizePxChange?: (sizePx: number) => void;
    primarySizePx?: number;
    minPrimarySizePx?: number;
    maxPrimarySizePx?: number;
    className?: string;
    style?: CSSProperties;
  };
  rootClassName?: string;
  rootStyle?: CSSProperties;
  shellPreset?: string;
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
  activityBarPosition = 'left',
  auxiliarySidebar,
  bottomPanel,
  compactStatus = true,
  onStatusItemActivate,
  overlays,
  primarySidebar,
  rootClassName,
  rootStyle,
  shellPreset,
  secondaryArea,
  statusSections,
  titleBar,
  theme,
  themePreference,
  themePreset,
}: WorkbenchShellProps) {
  const [overlaysElement, setOverlaysElement] = useState<HTMLDivElement | null>(null);
  const { visible: isActivityBarVisible = true, ...activityBarProps } = activityBar;
  const isTopActivityBar = activityBarPosition === 'top';
  const activityBarOrientation = isTopActivityBar ? 'horizontal' : 'vertical';

  const primarySidebarSizePx =
    primarySidebar?.onSizePxChange !== undefined
      ? (primarySidebar.primarySizePx ?? DEFAULT_PRIMARY_SIDEBAR_SIZE_PX)
      : undefined;

  const isPrimarySidebarCollapsed = primarySidebar !== undefined && !primarySidebar.isVisible;
  const isBottomPanelCollapsed = bottomPanel !== undefined && !bottomPanel.isVisible;
  const isAuxiliarySidebarCollapsed = auxiliarySidebar !== undefined && !auxiliarySidebar.isVisible;

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
      defaultPrimarySizePx={primarySidebar.primarySizePx ?? DEFAULT_PRIMARY_SIDEBAR_SIZE_PX}
      maxPrimarySizePx={primarySidebar.maxPrimarySizePx}
      minPrimarySizePx={primarySidebar.minPrimarySizePx}
      onPrimarySizePxChange={primarySidebar.onSizePxChange}
      primary={primarySidebar.node}
      primarySizePx={primarySidebarSizePx}
      primarySizeUnit="pixels"
      secondary={centerArea}
    />
  ) : (
    centerArea
  );

  const activityBarNode = (
    <ActivityBar
      {...activityBarProps}
      className={cx(
        activityBarProps.className,
        !isActivityBarVisible && 'ui-workbench-activity-bar--hidden',
      )}
      orientation={activityBarOrientation}
    />
  );

  return (
    <WorkbenchOverlaysProvider container={overlaysElement}>
      <div
        className={cx(
          rootClassName,
          isTopActivityBar && 'ide-root--activity-bar-top',
          !isActivityBarVisible && 'ide-root--activity-bar-hidden',
        )}
        data-theme={theme}
        data-theme-preference={themePreference}
        data-theme-preset={themePreset}
        data-shell-preset={shellPreset}
        style={rootStyle}
        onContextMenu={suppressNativeBrowserContextMenu}
      >
        {titleBar ? <header className="ui-workbench-titlebar">{titleBar}</header> : null}
        {isTopActivityBar ? activityBarNode : null}
        <div className="ide-workbench-surface">
          <div
            className={cx(
              'ide-body',
              isTopActivityBar && 'ide-body--activity-bar-top',
              !isActivityBarVisible && 'ide-body--activity-bar-hidden',
            )}
          >
            {!isTopActivityBar ? activityBarNode : null}
            {body}
          </div>
          <StatusBar
            compact={compactStatus}
            sections={statusSections}
            onItemActivate={onStatusItemActivate}
          />
          <div ref={setOverlaysElement} className="ide-workbench-overlays">
            {overlays}
          </div>
        </div>
      </div>
    </WorkbenchOverlaysProvider>
  );
}
