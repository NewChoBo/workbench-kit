import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  resolveWorkbenchFrameVisibility,
  type WorkbenchFramePresentation,
} from '@workbench-kit/workbench-core';
import '../chrome/workbench-layout-regions.css';
import { cx } from '../../utils/cx';
import { ActivityBar, type ActivityBarProps, type ActivityBarItem } from './ActivityBar';
import { SplitView } from './SplitView';
import { StatusBar, type StatusBarItemModel, type StatusBarSectionModel } from './StatusBar';
import { DEFAULT_PRIMARY_SIDEBAR_SIZE_PX } from './shellState';
import { suppressNativeBrowserContextMenu } from '../commands/workbenchContextMenu';
import { WorkbenchOverlaysProvider } from '../chrome/workbenchOverlaysContext';

import {
  WorkbenchPresentationScopeContext,
  WorkbenchFrameFocusContext,
  hasActiveWorkbenchGlobalModal,
} from '../../overlay/presentationScope';

const DEFAULT_BOTTOM_PANEL_SIZE_PERCENT = 30;

function clampBottomPanelSizePercent(value: number): number {
  return Math.min(70, Math.max(10, value));
}

function clampBottomPanelPrimarySizePercent(value: number): number {
  return Math.min(90, Math.max(30, value));
}

export type WorkbenchShellActivityBarPosition = 'left' | 'top';

export interface WorkbenchShellProps {
  activityBar: Omit<ActivityBarProps, 'items'> & {
    items: ActivityBarItem[];
    visible?: boolean;
  };
  activityBarPosition?: WorkbenchShellActivityBarPosition;
  /** Opt-in retained presentation. Omission preserves the original shell DOM. */
  presentation?: WorkbenchFramePresentation;
  /** Required in canvas presentation. Explicit null is an intentionally empty canvas. */
  canvasArea?: ReactNode;
  canvasAriaLabel?: string;
  dockedAriaLabel?: string;
  /** Fallback focus must be inside the corresponding retained presentation. */
  presentationFocusTargets?: Partial<
    Record<WorkbenchFramePresentation, RefObject<HTMLElement | null>>
  >;
  auxiliarySidebar?: {
    isVisible: boolean;
    node: ReactNode;
    className?: string;
    style?: CSSProperties;
  };
  bottomPanel?: {
    isVisible: boolean;
    node: ReactNode;
    /**
     * Panel track size as a percent of the vertical editor+panel split.
     * When set with `onSizePercentChange`, the split is controlled.
     */
    sizePercent?: number;
    onSizePercentChange?: (sizePercent: number) => void;
    className?: string;
    style?: CSSProperties;
  };
  compactStatus?: boolean;
  /** Accessible name for the status bar region (default “Status bar”). */
  statusBarAriaLabel?: string;
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
  presentation = 'docked',
  canvasArea,
  canvasAriaLabel = 'Canvas',
  dockedAriaLabel = 'Workbench',
  presentationFocusTargets,
  auxiliarySidebar,
  bottomPanel,
  compactStatus = true,
  statusBarAriaLabel,
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
  const retained = canvasArea !== undefined;
  const { visible: activityBarVisible = true, ...activityBarProps } = activityBar;
  const visibility = resolveWorkbenchFrameVisibility(
    {
      activityBar: { visible: activityBarVisible },
      sideBar: { visible: primarySidebar?.isVisible ?? false },
      auxiliaryBar: { visible: auxiliarySidebar?.isVisible ?? false },
      panel: { visible: bottomPanel?.isVisible ?? false },
    },
    presentation,
  );
  if (presentation === 'canvas' && !retained) {
    throw new TypeError(
      'WorkbenchShell canvas presentation requires canvasArea (use null for an empty canvas).',
    );
  }
  const isActivityBarVisible = visibility.activityBar;
  const dockedRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<Partial<Record<WorkbenchFramePresentation, HTMLElement>>>({});
  const previousPresentation = useRef(presentation);

  const focusInputs = useRef({ presentation, presentationFocusTargets });
  focusInputs.current = { presentation, presentationFocusTargets };
  const restorePresentationFocus = useCallback((previousFocus: HTMLElement | null = null) => {
    const { presentation: active, presentationFocusTargets: fallbacks } = focusInputs.current;
    const region = active === 'canvas' ? canvasRef.current : dockedRef.current;
    if (!region) return;
    // Global dialogs keep ownership, even before their initial-focus effect runs.
    if (hasActiveWorkbenchGlobalModal(region.ownerDocument)) return;
    const candidates = [
      previousFocus,
      lastFocus.current[active],
      fallbacks?.[active]?.current,
      region,
    ];
    for (const target of candidates) {
      if (
        !target ||
        target === region.ownerDocument.body ||
        target === region.ownerDocument.documentElement ||
        !isAvailableFocusTarget(target) ||
        (target !== previousFocus && !region.contains(target))
      )
        continue;
      target.focus({ preventScroll: true });
      if (region.ownerDocument.activeElement === target) return;
    }
  }, []);

  useLayoutEffect(() => {
    const changed = previousPresentation.current !== presentation;
    previousPresentation.current = presentation;
    if (retained && changed) restorePresentationFocus();
  }, [presentation, retained, restorePresentationFocus]);
  const isTopActivityBar = activityBarPosition === 'top';
  const activityBarOrientation = isTopActivityBar ? 'horizontal' : 'vertical';

  const primarySidebarSizePx =
    primarySidebar?.onSizePxChange !== undefined
      ? (primarySidebar.primarySizePx ?? DEFAULT_PRIMARY_SIDEBAR_SIZE_PX)
      : undefined;

  const isPrimarySidebarCollapsed = primarySidebar !== undefined && !primarySidebar.isVisible;
  const isBottomPanelCollapsed = bottomPanel !== undefined && !bottomPanel.isVisible;
  const isAuxiliarySidebarCollapsed = auxiliarySidebar !== undefined && !auxiliarySidebar.isVisible;

  const bottomPanelSizePercent =
    bottomPanel?.onSizePercentChange !== undefined
      ? (bottomPanel.sizePercent ?? DEFAULT_BOTTOM_PANEL_SIZE_PERCENT)
      : undefined;
  const bottomPanelPrimarySizePercent =
    bottomPanelSizePercent !== undefined
      ? clampBottomPanelPrimarySizePercent(100 - bottomPanelSizePercent)
      : undefined;

  const editorArea = bottomPanel ? (
    <SplitView
      className={cx(
        bottomPanel.className,
        isBottomPanelCollapsed && 'ui-workbench-split-view--secondary-collapsed',
      )}
      defaultPrimarySizePercent={100 - DEFAULT_BOTTOM_PANEL_SIZE_PERCENT}
      maxPrimarySizePercent={90}
      minPrimarySizePercent={30}
      onPrimarySizePercentChange={
        bottomPanel.onSizePercentChange
          ? (primarySizePercent) => {
              bottomPanel.onSizePercentChange?.(
                clampBottomPanelSizePercent(100 - primarySizePercent),
              );
            }
          : undefined
      }
      orientation="vertical"
      primary={secondaryArea}
      primarySizePercent={bottomPanelPrimarySizePercent}
      secondary={bottomPanel.node}
      secondaryHidden={retained ? !visibility.panel : undefined}
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
        secondaryHidden={retained ? !visibility.auxiliaryBar : undefined}
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
      primaryHidden={retained ? !visibility.sideBar : undefined}
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
      hidden={retained ? !visibility.activityBar : activityBarProps.hidden}
      inert={retained ? !visibility.activityBar : activityBarProps.inert}
      className={cx(
        activityBarProps.className,
        !isActivityBarVisible && 'ui-workbench-activity-bar--hidden',
      )}
      orientation={activityBarOrientation}
    />
  );

  const bodyNode = (
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
  );
  const statusNode = (
    <StatusBar
      aria-label={statusBarAriaLabel}
      compact={compactStatus}
      sections={statusSections}
      onItemActivate={onStatusItemActivate}
    />
  );

  return (
    <WorkbenchFrameFocusContext.Provider value={retained ? restorePresentationFocus : undefined}>
      <WorkbenchOverlaysProvider container={overlaysElement}>
        <div
          className={cx(
            rootClassName,
            retained && 'ui-workbench-frame',
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
          {!retained && isTopActivityBar ? activityBarNode : null}
          <div className="ide-workbench-surface">
            {retained ? (
              <>
                <WorkbenchPresentationRegion
                  active={presentation === 'docked'}
                  label={dockedAriaLabel}
                  presentation="docked"
                  regionRef={dockedRef}
                  onFocus={(element) => {
                    lastFocus.current.docked = element;
                  }}
                >
                  {isTopActivityBar ? activityBarNode : null}
                  {bodyNode}
                  {statusNode}
                </WorkbenchPresentationRegion>
                <WorkbenchPresentationRegion
                  active={presentation === 'canvas'}
                  label={canvasAriaLabel}
                  presentation="canvas"
                  regionRef={canvasRef}
                  onFocus={(element) => {
                    lastFocus.current.canvas = element;
                  }}
                >
                  <main className="ui-workbench-canvas-content" aria-label={canvasAriaLabel}>
                    {canvasArea}
                  </main>
                </WorkbenchPresentationRegion>
              </>
            ) : (
              <>
                {bodyNode}
                {statusNode}
              </>
            )}
            <div
              ref={setOverlaysElement}
              className="ide-workbench-overlays"
              data-workbench-global-overlays={retained ? '' : undefined}
            >
              {overlays}
            </div>
          </div>
        </div>
      </WorkbenchOverlaysProvider>
    </WorkbenchFrameFocusContext.Provider>
  );
}

function isAvailableFocusTarget(element: HTMLElement): boolean {
  if (
    !element.isConnected ||
    element.closest('[hidden], [inert], [aria-hidden="true"]') ||
    element.matches(':disabled, [aria-disabled="true"]')
  )
    return false;
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (style?.display === 'none' || style?.visibility === 'hidden') return false;
  }
  return true;
}

function WorkbenchPresentationRegion({
  active,
  children,
  label,
  presentation,
  regionRef,
  onFocus,
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  presentation: WorkbenchFramePresentation;
  regionRef: RefObject<HTMLDivElement | null>;
  onFocus: (element: HTMLElement) => void;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const parentScope = useContext(WorkbenchPresentationScopeContext);
  const scopeActive = active && parentScope?.active !== false;
  const bounds = regionRef;
  const scope = useMemo(
    () => ({ active: scopeActive, bounds, container }),
    [scopeActive, bounds, container],
  );
  return (
    <WorkbenchPresentationScopeContext.Provider value={scope}>
      <WorkbenchOverlaysProvider container={container}>
        <div
          ref={regionRef}
          aria-label={label}
          className="ui-workbench-presentation"
          data-workbench-presentation={presentation}
          hidden={!active}
          inert={!active}
          role="region"
          tabIndex={-1}
          onFocusCapture={(event) => {
            if (active) onFocus(event.target);
          }}
        >
          {children}
          <div
            ref={setContainer}
            className="ide-workbench-overlays"
            data-workbench-presentation-overlays=""
          />
        </div>
      </WorkbenchOverlaysProvider>
    </WorkbenchPresentationScopeContext.Provider>
  );
}
