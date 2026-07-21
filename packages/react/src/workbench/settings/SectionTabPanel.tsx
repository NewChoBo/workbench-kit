import { Fragment, useEffect, useRef, useState, type ComponentPropsWithRef } from 'react';
import { ScrollArea } from '../../primitives/scroll-area';
import { cx } from '../../utils/cx';
import type { WorkbenchSectionedPanelItem } from './SectionedPanel';
import { useSectionScrollSpy } from './useSectionScrollSpy';

const SCROLL_EDGE_THRESHOLD = 2;
const SECTION_TAB_PANEL_SCROLL_SPY_OFFSET = 80;

export type WorkbenchSectionTabPanelItem = WorkbenchSectionedPanelItem;

export interface WorkbenchSectionTabPanelProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  activeAnchorId?: string | undefined;
  ariaLabel: string;
  contentClassName?: string | undefined;
  defaultActiveAnchorId?: string | undefined;
  equalWidthTabs?: boolean | undefined;
  items: readonly WorkbenchSectionTabPanelItem[];
  navLinkClassName?: string | undefined;
  onActiveAnchorChange?: ((anchorId: string | undefined) => void) | undefined;
  readOnly?: boolean | undefined;
  scrollSpy?: boolean | 'auto' | undefined;
  scrollSpyOffset?: number | undefined;
  scrollSpyScrollBehavior?: ScrollBehavior | undefined;
}

function useSectionTabPanelNavScrollEdges(enabled: boolean) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const host = hostRef.current;
    if (!host) {
      return;
    }

    const scrollEl = host.querySelector(
      '.ui-workbench-section-tab-panel__tabs-scroll',
    ) as HTMLElement | null;

    if (!scrollEl) {
      return;
    }

    const update = () => {
      const { clientWidth, scrollLeft, scrollWidth } = scrollEl;
      const overflow = scrollWidth > clientWidth + SCROLL_EDGE_THRESHOLD;

      setAtStart(!overflow || scrollLeft <= SCROLL_EDGE_THRESHOLD);
      setAtEnd(!overflow || scrollLeft + clientWidth >= scrollWidth - SCROLL_EDGE_THRESHOLD);
    };

    update();

    scrollEl.addEventListener('scroll', update, { passive: true });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scrollEl);

    const tabs = scrollEl.querySelector('.ui-workbench-section-tab-panel__tabs');
    if (tabs instanceof HTMLElement) {
      resizeObserver.observe(tabs);
    }

    return () => {
      scrollEl.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
  }, [enabled]);

  return { hostRef, atStart, atEnd };
}

export function WorkbenchSectionTabPanel({
  activeAnchorId,
  ariaLabel,
  className,
  contentClassName,
  defaultActiveAnchorId,
  equalWidthTabs = true,
  items,
  navLinkClassName,
  onActiveAnchorChange,
  readOnly = false,
  scrollSpy = true,
  scrollSpyOffset = SECTION_TAB_PANEL_SCROLL_SPY_OFFSET,
  scrollSpyScrollBehavior = 'smooth',
  ...props
}: WorkbenchSectionTabPanelProps) {
  const showSectionNav = items.length > 1;
  const anchorOrder = items.map((item) => item.anchorId);
  const navScrollEdges = useSectionTabPanelNavScrollEdges(showSectionNav);

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

  const sectionNavLinks = items.map((item) => {
    const active = resolvedActiveAnchorId === item.anchorId;

    return (
      <a
        key={item.anchorId}
        aria-current={active ? 'location' : undefined}
        className={cx('ui-workbench-section-tab-panel__tab', navLinkClassName)}
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
    <div
      ref={navScrollEdges.hostRef}
      className={cx('ui-workbench-section-tab-panel', className)}
      data-equal-width-tabs={equalWidthTabs ? 'true' : undefined}
      data-readonly={readOnly ? 'true' : undefined}
      data-scroll-spy={scrollSpyEnabled ? 'true' : 'false'}
      data-tab-scroll-at-end={showSectionNav && !navScrollEdges.atEnd ? 'false' : undefined}
      data-tab-scroll-at-start={showSectionNav && !navScrollEdges.atStart ? 'false' : undefined}
      {...props}
    >
      {showSectionNav ? (
        <nav aria-label={ariaLabel} className="ui-workbench-section-tab-panel__bar">
          <div className="ui-workbench-section-tab-panel__tabs-scroll">
            <div className="ui-workbench-section-tab-panel__tabs">{sectionNavLinks}</div>
          </div>
        </nav>
      ) : null}
      <ScrollArea
        ref={scrollRef}
        className={cx('ui-workbench-section-tab-panel__scroll', contentClassName)}
        gutter="auto"
        orientation="vertical"
        scrollbars="overlay"
        onScroll={handleContentScroll}
      >
        {items.map((item) => (
          <Fragment key={item.anchorId}>{item.render()}</Fragment>
        ))}
      </ScrollArea>
    </div>
  );
}
