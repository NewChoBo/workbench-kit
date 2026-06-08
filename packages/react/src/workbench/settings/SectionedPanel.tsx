import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { WorkbenchNavigationPanel } from './NavigationPanel';
import {
  resolveWorkbenchSectionedPanelActiveAnchorId,
  resolveWorkbenchSectionedPanelScrollTop,
} from './sectionedPanelScrollSpy';

const SCROLL_SPY_OFFSET = 24;
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
  readOnly?: boolean | undefined;
}

function findPanelSection(content: HTMLElement, anchorId: string) {
  return (
    Array.from(content.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.id === anchorId,
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

function readSectionPositions(
  content: HTMLElement,
  items: readonly WorkbenchSectionedPanelItem[],
) {
  return items.flatMap((item) => {
    const section = findPanelSection(content, item.anchorId);
    if (!section) return [];

    return [
      {
        anchorId: item.anchorId,
        top: readSectionTop(content, section),
      },
    ];
  });
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
  readOnly = false,
  ...props
}: WorkbenchSectionedPanelProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const [uncontrolledActiveAnchorId, setUncontrolledActiveAnchorId] = useState<string | undefined>(
    defaultActiveAnchorId ?? items[0]?.anchorId,
  );
  const showSectionNav = items.length > 1;
  const preferredActiveAnchorId = activeAnchorId ?? uncontrolledActiveAnchorId;
  const resolvedActiveAnchorId =
    preferredActiveAnchorId && items.some((item) => item.anchorId === preferredActiveAnchorId)
      ? preferredActiveAnchorId
      : items[0]?.anchorId;

  const setActiveAnchorId = (anchorId: string | undefined) => {
    if (activeAnchorId === undefined) {
      setUncontrolledActiveAnchorId(anchorId);
    }

    onActiveAnchorChange?.(anchorId);
  };

  const updateActiveSection = () => {
    const content = contentRef.current;
    if (!content || items.length === 0 || isProgrammaticScrollRef.current) return;

    const nextActive = resolveWorkbenchSectionedPanelActiveAnchorId({
      fallbackAnchorId: items[0]?.anchorId,
      offset: SCROLL_SPY_OFFSET,
      scrollHeight: content.scrollHeight,
      scrollTop: content.scrollTop,
      sectionPositions: readSectionPositions(content, items),
      viewportHeight: content.clientHeight,
    });

    setActiveAnchorId(nextActive);
  };

  const scheduleActiveSectionUpdate = () => {
    if (isProgrammaticScrollRef.current) return;

    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      updateActiveSection();
    });
  };

  const setupIntersectionObserver = () => {
    const content = contentRef.current;
    if (!content || typeof IntersectionObserver === 'undefined') return;

    intersectionObserverRef.current?.disconnect();

    const observer = new IntersectionObserver(
      () => {
        scheduleActiveSectionUpdate();
      },
      {
        root: content,
        rootMargin: `-${SCROLL_SPY_OFFSET}px 0px -55% 0px`,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const item of items) {
      const section = findPanelSection(content, item.anchorId);
      if (section) {
        observer.observe(section);
      }
    }

    intersectionObserverRef.current = observer;
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

    const targetTop = resolveWorkbenchSectionedPanelScrollTop({
      offset: SCROLL_SPY_OFFSET,
      sectionTop: readSectionTop(content, section),
    });

    isProgrammaticScrollRef.current = true;
    setActiveAnchorId(anchorId);
    content.scrollTo({ top: targetTop });

    if (programmaticScrollTimerRef.current) {
      clearTimeout(programmaticScrollTimerRef.current);
    }

    programmaticScrollTimerRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      updateActiveSection();
    }, PROGRAMMATIC_SCROLL_SETTLE_MS);
  };

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;

    scheduleActiveSectionUpdate();
    setupIntersectionObserver();

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            scheduleActiveSectionUpdate();
          });
    resizeObserver?.observe(content);

    return () => {
      resizeObserver?.disconnect();
      intersectionObserverRef.current?.disconnect();
      intersectionObserverRef.current = null;
    };
  }, [items]);

  useEffect(
    () => () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }

      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }

      intersectionObserverRef.current?.disconnect();
    },
    [],
  );

  return (
    <WorkbenchNavigationPanel
      className={cx('ui-workbench-sectioned-panel', className)}
      content={items.map((item) => (
        <Fragment key={item.anchorId}>{item.render()}</Fragment>
      ))}
      contentClassName={cx('ui-workbench-sectioned-panel__content', contentClassName)}
      contentProps={{
        ref: contentRef,
        onScroll: scheduleActiveSectionUpdate,
      }}
      data-readonly={readOnly ? 'true' : undefined}
      nav={
        showSectionNav
          ? items.map((item) => {
              const active = resolvedActiveAnchorId === item.anchorId;

              return (
                <a
                  key={item.anchorId}
                  aria-current={active ? 'true' : undefined}
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
            })
          : null
      }
      navClassName={cx('ui-workbench-sectioned-panel__nav', navClassName)}
      navProps={{ 'aria-label': ariaLabel }}
      {...props}
    />
  );
}
