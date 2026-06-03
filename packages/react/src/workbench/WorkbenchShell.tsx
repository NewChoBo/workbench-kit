import type { CSSProperties, ReactNode } from 'react';
import { ActivityBar, type ActivityBarProps, type ActivityBarItem } from './ActivityBar';
import { SplitView } from './SplitView';
import { StatusBar, type StatusBarItemModel, type StatusBarSectionModel } from './StatusBar';

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
  theme,
}: WorkbenchShellProps) {
  const body = primarySidebar?.isVisible ? (
    <SplitView
      className={primarySidebar?.className}
      minPrimarySizePercent={primarySidebar?.minPrimarySizePercent}
      maxPrimarySizePercent={primarySidebar?.maxPrimarySizePercent}
      onPrimarySizePercentChange={primarySidebar?.onSizePercentChange}
      primary={primarySidebar.node}
      primarySizePercent={primarySidebar.primarySizePercent}
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
    >
      <div className="ide-body">
        <ActivityBar {...activityBar} />
        {body}
      </div>
      <StatusBar compact={compactStatus} sections={statusSections} onItemActivate={onStatusItemActivate} />
      {overlays}
    </div>
  );
}
