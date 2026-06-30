import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { IconButton } from '../../primitives/IconButton';
import { cx } from '../../utils/cx';
import { WorkbenchNavigationPanel } from './NavigationPanel';
import {
  WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  createWorkbenchSectionedPanelIntersectionRootMargin,
  isWorkbenchSectionedPanelScrollable,
  resolveWorkbenchSectionedPanelActiveAnchorFromScroll,
  resolveWorkbenchSectionedPanelScrollTop,
} from './sectionedPanelScrollSpy';

const PROGRAMMATIC_SCROLL_SETTLE_MS = 400;

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
  sectionNavCollapsed?: boolean | undefined;
  sectionNavCollapsible?: boolean | undefined;
  defaultSectionNavCollapsed?: boolean | undefined;
}

function findPanelSection(content: HTMLElement, anchorId: string) {
  return (
    Array.from(content.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.id === anchorId,
    ) ?? null
  );
}

function readSectionTop(content: HTMLElement, section: HTMLElement) {
  if (section.parentElement === content) {
    return section.offsetTop;
  }

  const containerRect = content.getBoundingClientRect();
  const sectionRect = section.getBoundingClientRect();
  return sectionRect.top - containerRect.top + content.scrollTop;
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
  sectionNavCollapsed,
  sectionNavCollapsible,
  defaultSectionNavCollapsed = false,
  ...props
}: WorkbenchSectionedPanelProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const scrollSpyRafRef = useRef<number | null>(null);
  const trackedActiveAnchorIdRef = useRef<string | undefined>(undefined);
  const scrollSpyEnabledRef = useRef(false);
  const [scrollSpyEnabled, setScrollSpyEnabled] = useState(false);
  const [uncontrolledActiveAnchorId, setUncontrolledActiveAnchorId] = useState<string | undefined>(
    defaultActiveAnchorId ?? items[0]?.anchorId,
  );
  const showSectionNav = items.length > 1;
  const canCollapseSectionNav = showSectionNav && (sectionNavCollapsible ?? true);
  const [uncontrolledSectionNavCollapsed, setUncontrolledSectionNavCollapsed] = useState(
    defaultSectionNavCollapsed,
  );
  const sectionNavIsCollapsed =
    canCollapseSectionNav && (sectionNavCollapsed ?? uncontrolledSectionNavCollapsed);
  const anchorOrder = items.map((item) => item.anchorId);
  const preferredActiveAnchorId = activeAnchorId ?? uncontrolledActiveAnchorId;
  const resolvedActiveAnchorId =
    preferredActiveAnchorId && items.some((item) => item.anchorId === preferredActiveAnchorId)
      ? preferredActiveAnchorId
      : items[0]?.anchorId;

  trackedActiveAnchorIdRef.current = resolvedActiveAnchorId;

  const setSectionNavCollapsed = (collapsed: boolean) => {
    if (sectionNavCollapsed === undefined) {
      setUncontrolledSectionNavCollapsed(collapsed);
    }

    onSectionNavCollapsedChange?.(collapsed);
  };

  const commitActiveAnchorId = (anchorId: string | undefined) => {
    if (!anchorId || anchorId === trackedActiveAnchorIdRef.current) {
      return;
    }

    trackedActiveAnchorIdRef.current = anchorId;

    if (activeAnchorId === undefined) {
      setUncontrolledActiveAnchorId(anchorId);
    }

    onActiveAnchorChange?.(anchorId);
  };

  const setActiveAnchorId = (anchorId: string | undefined) => {
    if (!anchorId) return;

    trackedActiveAnchorIdRef.current = anchorId;

    if (activeAnchorId === undefined) {
      setUncontrolledActiveAnchorId(anchorId);
    }

    onActiveAnchorChange?.(anchorId);
  };

  const resolveScrollSpyEnabled = (content: HTMLElement) => {
    if (scrollSpy === false) return false;
    if (scrollSpy === true) return true;
    return isWorkbenchSectionedPanelScrollable({
      clientHeight: content.clientHeight,
      scrollHeight: content.scrollHeight,
    });
  };

  const updateScrollSpyEnabled = () => {
    const content = contentRef.current;
    if (!content) return false;

    const nextEnabled = resolveScrollSpyEnabled(content);
    scrollSpyEnabledRef.current = nextEnabled;
    setScrollSpyEnabled(nextEnabled);
    return nextEnabled;
  };

  const readSectionPositions = (content: HTMLElement) =>
    items
      .map((item) => {
        const section = findPanelSection(content, item.anchorId);
        if (!section) return null;

        return {
          anchorId: item.anchorId,
          top: readSectionTop(content, section),
        };
      })
      .filter((section): section is { anchorId: string; top: number } => section !== null);

  const applyScrollSpyActiveAnchor = () => {
    scrollSpyRafRef.current = null;

    const content = contentRef.current;
    if (
      !content ||
      items.length === 0 ||
      !scrollSpyEnabledRef.current ||
      isProgrammaticScrollRef.current
    ) {
      return;
    }

    const nextActive = resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
      anchorOrder,
      clientHeight: content.clientHeight,
      fallbackAnchorId: items[0]?.anchorId,
      scrollHeight: content.scrollHeight,
      scrollTop: content.scrollTop,
      sectionPositions: readSectionPositions(content),
    });

    commitActiveAnchorId(nextActive);
  };

  const scheduleScrollSpyUpdate = () => {
    if (scrollSpyRafRef.current !== null) return;

    scrollSpyRafRef.current = requestAnimationFrame(applyScrollSpyActiveAnchor);
  };

  const handleIntersection = () => {
    if (items.length === 0 || !scrollSpyEnabledRef.current || isProgrammaticScrollRef.current) {
      return;
    }

    scheduleScrollSpyUpdate();
  };

  const disconnectIntersectionObserver = () => {
    intersectionObserverRef.current?.disconnect();
    intersectionObserverRef.current = null;
  };

  const setupIntersectionObserver = () => {
    const content = contentRef.current;
    if (!content || typeof IntersectionObserver === 'undefined' || !scrollSpyEnabledRef.current) {
      disconnectIntersectionObserver();
      return;
    }

    disconnectIntersectionObserver();

    const observer = new IntersectionObserver(handleIntersection, {
      root: content,
      rootMargin: createWorkbenchSectionedPanelIntersectionRootMargin(
        WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
      ),
      threshold: [0],
    });

    for (const item of items) {
      const section = findPanelSection(content, item.anchorId);
      if (section) {
        observer.observe(section);
      }
    }

    intersectionObserverRef.current = observer;
  };

  const refreshScrollSpy = () => {
    const enabled = updateScrollSpyEnabled();
    if (enabled) {
      setupIntersectionObserver();
      scheduleScrollSpyUpdate();
      return;
    }

    disconnectIntersectionObserver();
  };

  const scrollToSection = (anchorId: string) => {
    const content = contentRef.current;
    if (!content) {
      setActiveAnchorId(anchorId);
      return;
    }

    const section = findPanelSection(content, anchorId);
    if (!section) {
      setActiveAnchorId(anchorId);
      return;
    }

    setActiveAnchorId(anchorId);

    if (!scrollSpyEnabledRef.current) {
      return;
    }

    const targetTop = resolveWorkbenchSectionedPanelScrollTop({
      sectionTop: readSectionTop(content, section),
    });

    isProgrammaticScrollRef.current = true;
    content.scrollTo({ top: targetTop });

    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }

    programmaticScrollTimerRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      scheduleScrollSpyUpdate();
    }, PROGRAMMATIC_SCROLL_SETTLE_MS);
  };

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;

    refreshScrollSpy();

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            refreshScrollSpy();
          });
    resizeObserver?.observe(content);

    return () => {
      resizeObserver?.disconnect();
      disconnectIntersectionObserver();

      if (scrollSpyRafRef.current !== null) {
        cancelAnimationFrame(scrollSpyRafRef.current);
        scrollSpyRafRef.current = null;
      }
    };
  }, [items, scrollSpy]);

  useEffect(
    () => () => {
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }

      if (scrollSpyRafRef.current !== null) {
        cancelAnimationFrame(scrollSpyRafRef.current);
        scrollSpyRafRef.current = null;
      }

      disconnectIntersectionObserver();
    },
    [],
  );

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
          scrollToSection(item.anchorId);
        }}
      >
        <span>{item.title}</span>
        {item.count !== undefined ? <em>{item.count}</em> : null}
      </a>
    );
  });

  return (
    <div className="ui-workbench-sectioned-panel-host">
      <WorkbenchNavigationPanel
        className={cx('ui-workbench-sectioned-panel', className)}
        content={
          <div
            ref={contentRef}
            className="ui-workbench-sectioned-panel__scroll"
            onScroll={scheduleScrollSpyUpdate}
          >
            {items.map((item) => (
              <Fragment key={item.anchorId}>{item.render()}</Fragment>
            ))}
          </div>
        }
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
