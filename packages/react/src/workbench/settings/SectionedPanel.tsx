import { Fragment, useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { IconButton } from '../../primitives/icon-button';
import { cx } from '../../utils/cx';
import { WorkbenchNavigationPanel } from './NavigationPanel';
import { WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET } from './sectionedPanelScrollSpy';
import { useSectionScrollSpy } from './useSectionScrollSpy';

export interface WorkbenchSectionedPanelItem {
  anchorId: string;
  count?: number | undefined;
  render: () => ReactNode;
  title: ReactNode;
}

export interface WorkbenchSectionedPanelProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  activeAnchorId?: string | undefined;
  ariaLabel: string;
  contentClassName?: string | undefined;
  defaultActiveAnchorId?: string | undefined;
  items: readonly WorkbenchSectionedPanelItem[];
  navClassName?: string | undefined;
  navLinkClassName?: string | undefined;
  onActiveAnchorChange?: ((anchorId: string | undefined) => void) | undefined;
  onSectionNavCollapsedChange?: ((collapsed: boolean) => void) | undefined;
  readOnly?: boolean | undefined;
  scrollSpy?: boolean | 'auto' | undefined;
  scrollSpyOffset?: number | undefined;
  scrollSpyScrollBehavior?: ScrollBehavior | undefined;
  sectionNavCollapsed?: boolean | undefined;
  sectionNavCollapsible?: boolean | undefined;
  defaultSectionNavCollapsed?: boolean | undefined;
}

export function WorkbenchSectionedPanel({
  activeAnchorId,
  ariaLabel,
  className,
  contentClassName,
  defaultActiveAnchorId,
  items,
  navClassName,
  navLinkClassName,
  onActiveAnchorChange,
  onSectionNavCollapsedChange,
  readOnly = false,
  scrollSpy = 'auto',
  scrollSpyOffset = WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  scrollSpyScrollBehavior = 'smooth',
  sectionNavCollapsed,
  sectionNavCollapsible = true,
  defaultSectionNavCollapsed = false,
  ...props
}: WorkbenchSectionedPanelProps) {
  const showSectionNav = items.length > 1;
  const anchorOrder = items.map((item) => item.anchorId);
  const canCollapseSectionNav = showSectionNav && sectionNavCollapsible;
  const [uncontrolledSectionNavCollapsed, setUncontrolledSectionNavCollapsed] = useState(
    defaultSectionNavCollapsed,
  );
  const sectionNavIsCollapsed =
    canCollapseSectionNav && (sectionNavCollapsed ?? uncontrolledSectionNavCollapsed);

  const {
    handleContentScroll,
    resolvedActiveAnchorId,
    scrollRef,
    scrollSpyEnabled,
    scrollToAnchor,
  } = useSectionScrollSpy({
    activeAnchorId,
    anchorOrder,
    axis: 'vertical',
    defaultActiveAnchorId,
    offset: scrollSpyOffset,
    onActiveAnchorChange,
    scrollBehavior: scrollSpyScrollBehavior,
    scrollSpy,
  });

  const setSectionNavCollapsed = (collapsed: boolean) => {
    if (sectionNavCollapsed === undefined) {
      setUncontrolledSectionNavCollapsed(collapsed);
    }

    onSectionNavCollapsedChange?.(collapsed);
  };

  const sectionNavLinks = items.map((item) => {
    const active = resolvedActiveAnchorId === item.anchorId;

    return (
      <a
        key={item.anchorId}
        aria-current={active ? 'location' : undefined}
        className={cx('ui-workbench-sectioned-panel__nav-link', navLinkClassName)}
        data-active={active ? 'true' : undefined}
        href={`#${item.anchorId}`}
        onClick={(event) => {
          event.preventDefault();
          scrollToAnchor(item.anchorId);
        }}
      >
        <span>{item.title}</span>
        {item.count !== undefined ? <em>{item.count}</em> : null}
      </a>
    );
  });

  return (
    <div className="ui-workbench-sectioned-panel-root">
      <WorkbenchNavigationPanel
        className={cx('ui-workbench-sectioned-panel', className)}
        contentScrollbars="hidden"
        content={items.map((item) => (
          <Fragment key={item.anchorId}>{item.render()}</Fragment>
        ))}
        contentScrollProps={{
          className: 'ui-workbench-sectioned-panel__scroll',
          onScroll: handleContentScroll,
          ref: scrollRef,
        }}
        contentClassName={cx('ui-workbench-sectioned-panel__body', contentClassName)}
        contentScrollGutter="auto"
        data-nav-collapsed={sectionNavIsCollapsed ? 'true' : undefined}
        data-readonly={readOnly ? 'true' : undefined}
        data-scroll-spy={scrollSpyEnabled ? 'true' : 'false'}
        navScrollGutter="auto"
        nav={
          showSectionNav && !sectionNavIsCollapsed ? (
            <div className="ui-workbench-sectioned-panel__nav-shell">
              <div className="ui-workbench-sectioned-panel__nav-links">{sectionNavLinks}</div>
              {canCollapseSectionNav ? (
                <div className="ui-workbench-sectioned-panel__nav-footer">
                  <IconButton
                    compact
                    className="ui-workbench-sectioned-panel__nav-toggle"
                    icon="codicon-chevron-left"
                    label="Hide section navigation"
                    onClick={() => setSectionNavCollapsed(true)}
                  />
                </div>
              ) : null}
            </div>
          ) : null
        }
        navClassName={cx('ui-workbench-sectioned-panel__nav', navClassName)}
        navProps={{ 'aria-label': ariaLabel }}
        {...props}
      />

      {sectionNavIsCollapsed && canCollapseSectionNav ? (
        <div className="ui-workbench-sectioned-panel__nav-reveal-zone">
          <div className="ui-workbench-sectioned-panel__nav-open-overlay">
            <IconButton
              compact
              className="ui-workbench-sectioned-panel__nav-toggle ui-workbench-sectioned-panel__nav-toggle--overlay"
              icon="codicon-chevron-right"
              label="Show section navigation"
              onClick={() => setSectionNavCollapsed(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
