import { useCallback, useEffect, useRef, useState } from 'react';
import {
  WORKBENCH_SECTIONED_PANEL_INTERSECTION_THRESHOLDS,
  WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  createWorkbenchSectionedPanelIntersectionRootMargin,
  isWorkbenchSectionedPanelScrollable,
  readWorkbenchSectionedPanelScrollMetrics,
  resolveWorkbenchSectionedPanelActiveAnchorFromScroll,
  resolveWorkbenchSectionedPanelProgrammaticScrollSettleMs,
  resolveWorkbenchSectionedPanelScrollTarget,
  shouldPreserveNavClickActiveAnchor,
  type WorkbenchSectionedPanelScrollSpyAxis,
} from './sectionedPanelScrollSpy';
import {
  animateSectionPanelScrollTo,
  findPanelSection,
  readSectionPositions,
  readSectionStart,
} from './sectionScrollSpyDom';

const ACTIVE_UPDATE_DEBOUNCE_MS = 50;

export interface UseSectionScrollSpyOptions {
  activeAnchorId?: string | undefined;
  anchorOrder: readonly string[];
  axis?: WorkbenchSectionedPanelScrollSpyAxis | undefined;
  defaultActiveAnchorId?: string | undefined;
  offset?: number | undefined;
  onActiveAnchorChange?: ((anchorId: string | undefined) => void) | undefined;
  scrollBehavior?: ScrollBehavior | undefined;
  scrollSpy?: boolean | 'auto' | undefined;
}

export function useSectionScrollSpy({
  activeAnchorId: controlledActiveAnchorId,
  anchorOrder,
  axis = 'vertical',
  defaultActiveAnchorId,
  offset = WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  onActiveAnchorChange,
  scrollBehavior = 'smooth',
  scrollSpy = 'auto',
}: UseSectionScrollSpyOptions) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTargetAnchorRef = useRef<string | null>(null);
  const cancelProgrammaticScrollRef = useRef<(() => void) | null>(null);
  const preserveNavClickAnchorRef = useRef<{
    anchorId: string;
    scrollPosition: number;
    scrollSize: number;
  } | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const scrollSpyEnabledRef = useRef(false);
  const [scrollSpyEnabled, setScrollSpyEnabled] = useState(false);
  const [uncontrolledActiveAnchorId, setUncontrolledActiveAnchorId] = useState<string | undefined>(
    defaultActiveAnchorId ?? anchorOrder[0],
  );

  const trackedActiveAnchorIdRef = useRef<string | undefined>(undefined);
  const preferredActiveAnchorId = controlledActiveAnchorId ?? uncontrolledActiveAnchorId;
  const resolvedActiveAnchorId =
    preferredActiveAnchorId && anchorOrder.includes(preferredActiveAnchorId)
      ? preferredActiveAnchorId
      : anchorOrder[0];

  trackedActiveAnchorIdRef.current = resolvedActiveAnchorId;

  const isProgrammaticScrollPinned = useCallback(
    () => isProgrammaticScrollRef.current || programmaticScrollTargetAnchorRef.current !== null,
    [],
  );

  const commitActiveAnchorId = useCallback(
    (anchorId: string | undefined) => {
      if (!anchorId || anchorId === trackedActiveAnchorIdRef.current) {
        return;
      }

      trackedActiveAnchorIdRef.current = anchorId;

      if (controlledActiveAnchorId === undefined) {
        setUncontrolledActiveAnchorId(anchorId);
      }

      onActiveAnchorChange?.(anchorId);
    },
    [controlledActiveAnchorId, onActiveAnchorChange],
  );

  const setActiveAnchorId = useCallback(
    (anchorId: string | undefined) => {
      if (!anchorId) return;

      trackedActiveAnchorIdRef.current = anchorId;

      if (controlledActiveAnchorId === undefined) {
        setUncontrolledActiveAnchorId(anchorId);
      }

      onActiveAnchorChange?.(anchorId);
    },
    [controlledActiveAnchorId, onActiveAnchorChange],
  );

  const resolveScrollSpyEnabled = useCallback(
    (content: HTMLElement) => {
      if (scrollSpy === false) return false;
      if (scrollSpy === true) return true;

      const metrics = readWorkbenchSectionedPanelScrollMetrics(content, axis);
      return isWorkbenchSectionedPanelScrollable({
        axis,
        clientSize: metrics.clientSize,
        scrollSize: metrics.scrollSize,
      });
    },
    [axis, scrollSpy],
  );

  const updateActiveAnchorFromScroll = useCallback(() => {
    const content = scrollRef.current;
    if (
      !content ||
      anchorOrder.length === 0 ||
      !scrollSpyEnabledRef.current ||
      isProgrammaticScrollPinned()
    ) {
      return;
    }

    const metrics = readWorkbenchSectionedPanelScrollMetrics(content, axis);
    const preserveNavClick = preserveNavClickAnchorRef.current;

    if (preserveNavClick) {
      if (
        shouldPreserveNavClickActiveAnchor({
          pinnedScrollPosition: preserveNavClick.scrollPosition,
          pinnedScrollSize: preserveNavClick.scrollSize,
          scrollPosition: metrics.scrollPosition,
          scrollSize: metrics.scrollSize,
        })
      ) {
        commitActiveAnchorId(preserveNavClick.anchorId);
        return;
      }

      preserveNavClickAnchorRef.current = null;
    }

    const nextActive = resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
      anchorOrder,
      clientSize: metrics.clientSize,
      fallbackAnchorId: anchorOrder[0],
      offset,
      scrollPosition: metrics.scrollPosition,
      scrollSize: metrics.scrollSize,
      sectionPositions: readSectionPositions(content, anchorOrder, axis),
    });

    commitActiveAnchorId(nextActive);
  }, [anchorOrder, axis, commitActiveAnchorId, isProgrammaticScrollPinned, offset]);

  const cancelPendingScrollSpyUpdate = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  const cancelProgrammaticScroll = useCallback(() => {
    cancelProgrammaticScrollRef.current?.();
    cancelProgrammaticScrollRef.current = null;
  }, []);

  const finishProgrammaticScroll = useCallback(() => {
    if (!isProgrammaticScrollRef.current && programmaticScrollTargetAnchorRef.current === null) {
      return;
    }

    cancelProgrammaticScroll();
    cancelPendingScrollSpyUpdate();

    const clickedAnchor = programmaticScrollTargetAnchorRef.current;
    isProgrammaticScrollRef.current = false;
    programmaticScrollTargetAnchorRef.current = null;

    if (clickedAnchor) {
      const content = scrollRef.current;
      if (content) {
        const metrics = readWorkbenchSectionedPanelScrollMetrics(content, axis);
        preserveNavClickAnchorRef.current = {
          anchorId: clickedAnchor,
          scrollPosition: metrics.scrollPosition,
          scrollSize: metrics.scrollSize,
        };
      }

      commitActiveAnchorId(clickedAnchor);
      return;
    }

    updateActiveAnchorFromScroll();
  }, [
    axis,
    cancelPendingScrollSpyUpdate,
    cancelProgrammaticScroll,
    commitActiveAnchorId,
    updateActiveAnchorFromScroll,
  ]);

  const scheduleActiveUpdate = useCallback(
    (delay = ACTIVE_UPDATE_DEBOUNCE_MS) => {
      if (isProgrammaticScrollPinned()) {
        return;
      }

      cancelPendingScrollSpyUpdate();

      scrollTimeoutRef.current = setTimeout(() => {
        scrollTimeoutRef.current = null;
        updateActiveAnchorFromScroll();
      }, delay);
    },
    [cancelPendingScrollSpyUpdate, isProgrammaticScrollPinned, updateActiveAnchorFromScroll],
  );

  const disconnectIntersectionObserver = useCallback(() => {
    intersectionObserverRef.current?.disconnect();
    intersectionObserverRef.current = null;
  }, []);

  const setupIntersectionObserver = useCallback(() => {
    const content = scrollRef.current;
    if (!content || typeof IntersectionObserver === 'undefined' || !scrollSpyEnabledRef.current) {
      disconnectIntersectionObserver();
      return;
    }

    disconnectIntersectionObserver();

    const observer = new IntersectionObserver(
      () => {
        if (isProgrammaticScrollPinned()) {
          return;
        }

        scheduleActiveUpdate(0);
      },
      {
        root: content,
        rootMargin: createWorkbenchSectionedPanelIntersectionRootMargin(offset, axis),
        threshold: [...WORKBENCH_SECTIONED_PANEL_INTERSECTION_THRESHOLDS],
      },
    );

    for (const anchorId of anchorOrder) {
      const section = findPanelSection(content, anchorId);
      if (section) {
        observer.observe(section);
      }
    }

    intersectionObserverRef.current = observer;
  }, [
    anchorOrder,
    axis,
    disconnectIntersectionObserver,
    isProgrammaticScrollPinned,
    offset,
    scheduleActiveUpdate,
  ]);

  const refreshScrollSpy = useCallback(() => {
    const content = scrollRef.current;
    if (!content) return;

    const nextEnabled = resolveScrollSpyEnabled(content);
    scrollSpyEnabledRef.current = nextEnabled;
    setScrollSpyEnabled(nextEnabled);

    if (nextEnabled) {
      setupIntersectionObserver();
      if (!isProgrammaticScrollPinned()) {
        scheduleActiveUpdate(0);
      }
      return;
    }

    disconnectIntersectionObserver();
  }, [
    disconnectIntersectionObserver,
    isProgrammaticScrollPinned,
    resolveScrollSpyEnabled,
    scheduleActiveUpdate,
    setupIntersectionObserver,
  ]);

  const scrollToAnchor = useCallback(
    (anchorId: string) => {
      const content = scrollRef.current;
      if (!content) {
        setActiveAnchorId(anchorId);
        return;
      }

      const section = findPanelSection(content, anchorId);
      if (!section) {
        setActiveAnchorId(anchorId);
        return;
      }

      cancelProgrammaticScroll();
      cancelPendingScrollSpyUpdate();
      preserveNavClickAnchorRef.current = null;

      setActiveAnchorId(anchorId);

      if (!scrollSpyEnabledRef.current) {
        return;
      }

      const target = resolveWorkbenchSectionedPanelScrollTarget({
        offset,
        sectionStart: readSectionStart(content, section, axis),
      });

      programmaticScrollTargetAnchorRef.current = anchorId;
      isProgrammaticScrollRef.current = true;

      const durationMs = resolveWorkbenchSectionedPanelProgrammaticScrollSettleMs(scrollBehavior);

      cancelProgrammaticScrollRef.current = animateSectionPanelScrollTo({
        axis,
        durationMs,
        element: content,
        onComplete: finishProgrammaticScroll,
        target,
      });
    },
    [
      axis,
      cancelPendingScrollSpyUpdate,
      cancelProgrammaticScroll,
      finishProgrammaticScroll,
      offset,
      scrollBehavior,
      setActiveAnchorId,
    ],
  );

  const handleContentScroll = useCallback(() => {
    if (isProgrammaticScrollPinned()) {
      return;
    }

    scheduleActiveUpdate();
  }, [isProgrammaticScrollPinned, scheduleActiveUpdate]);

  useEffect(() => {
    const content = scrollRef.current;
    if (!content) return undefined;

    refreshScrollSpy();

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            refreshScrollSpy();
          });
    resizeObserver?.observe(content);

    const mutationObserver =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            refreshScrollSpy();
          });
    mutationObserver?.observe(content, {
      attributes: false,
      characterData: false,
      childList: true,
      subtree: true,
    });

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      disconnectIntersectionObserver();
      cancelPendingScrollSpyUpdate();
    };
  }, [
    anchorOrder,
    axis,
    cancelPendingScrollSpyUpdate,
    disconnectIntersectionObserver,
    offset,
    refreshScrollSpy,
    scrollSpy,
  ]);

  useEffect(
    () => () => {
      cancelProgrammaticScroll();
      cancelPendingScrollSpyUpdate();
      disconnectIntersectionObserver();
    },
    [cancelPendingScrollSpyUpdate, cancelProgrammaticScroll, disconnectIntersectionObserver],
  );

  return {
    handleContentScroll,
    resolvedActiveAnchorId,
    scrollRef,
    scrollSpyEnabled,
    scrollToAnchor,
  };
}
