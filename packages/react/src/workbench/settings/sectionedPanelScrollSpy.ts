export const WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET = 24;
export const WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_ACTIVE_LINE_BIAS = 20;
export const WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD = 2;
/** Fixed-duration programmatic section scroll (smooth tab/nav clicks). */
export const WORKBENCH_SECTIONED_PANEL_PROGRAMMATIC_SCROLL_SETTLE_MS_SMOOTH = 700;
export const WORKBENCH_SECTIONED_PANEL_PROGRAMMATIC_SCROLL_SETTLE_MS_INSTANT = 0;

export function resolveWorkbenchSectionedPanelProgrammaticScrollSettleMs(
  behavior: ScrollBehavior = 'smooth',
): number {
  return behavior === 'smooth'
    ? WORKBENCH_SECTIONED_PANEL_PROGRAMMATIC_SCROLL_SETTLE_MS_SMOOTH
    : WORKBENCH_SECTIONED_PANEL_PROGRAMMATIC_SCROLL_SETTLE_MS_INSTANT;
}

export function resolveWorkbenchSectionedPanelClampedScrollTarget({
  clientSize,
  scrollSize,
  targetScrollPosition,
}: {
  clientSize: number;
  scrollSize: number;
  targetScrollPosition: number;
}): number {
  const maxScroll = Math.max(0, scrollSize - clientSize);
  return Math.min(Math.max(0, targetScrollPosition), maxScroll);
}

export const WORKBENCH_SECTIONED_PANEL_INTERSECTION_THRESHOLDS = [0, 0.25, 0.5, 0.75, 1] as const;

export type WorkbenchSectionedPanelScrollSpyAxis = 'vertical' | 'horizontal';

export interface WorkbenchSectionedPanelIntersectionEntry {
  intersectionRatio: number;
  isIntersecting: boolean;
  target: { id: string };
}

export interface WorkbenchSectionedPanelScrollPosition {
  anchorId: string;
  /** Section start along the active scroll axis (top or left). */
  start: number;
  /** Section end along the active scroll axis (bottom or right). */
  end: number;
}

export interface WorkbenchSectionedPanelScrollMetrics {
  clientSize: number;
  scrollPosition: number;
  scrollSize: number;
}

export function readWorkbenchSectionedPanelScrollMetrics(
  element: HTMLElement,
  axis: WorkbenchSectionedPanelScrollSpyAxis = 'vertical',
): WorkbenchSectionedPanelScrollMetrics {
  if (axis === 'horizontal') {
    return {
      clientSize: element.clientWidth,
      scrollSize: element.scrollWidth,
      scrollPosition: element.scrollLeft,
    };
  }

  return {
    clientSize: element.clientHeight,
    scrollSize: element.scrollHeight,
    scrollPosition: element.scrollTop,
  };
}

export function isWorkbenchSectionedPanelScrollable({
  axis = 'vertical',
  clientSize,
  scrollSize,
  threshold = WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD,
}: {
  axis?: WorkbenchSectionedPanelScrollSpyAxis | undefined;
  clientSize: number;
  scrollSize: number;
  threshold?: number | undefined;
}): boolean {
  void axis;
  return scrollSize > clientSize + threshold;
}

export function isWorkbenchSectionedPanelAtScrollStart({
  scrollPosition,
  startThreshold = WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD,
}: {
  scrollPosition: number;
  startThreshold?: number | undefined;
}): boolean {
  return scrollPosition <= startThreshold;
}

export function isWorkbenchSectionedPanelAtScrollEnd({
  bottomThreshold = WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD,
  clientSize,
  scrollPosition,
  scrollSize,
}: {
  bottomThreshold?: number | undefined;
  clientSize: number;
  scrollPosition: number;
  scrollSize: number;
}): boolean {
  return scrollPosition + clientSize >= scrollSize - bottomThreshold;
}

/** @deprecated Use `isWorkbenchSectionedPanelAtScrollStart`. */
export function isWorkbenchSectionedPanelAtScrollTop({
  scrollTop,
  topThreshold = WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD,
}: {
  scrollTop: number;
  topThreshold?: number | undefined;
}): boolean {
  return isWorkbenchSectionedPanelAtScrollStart({
    scrollPosition: scrollTop,
    startThreshold: topThreshold,
  });
}

/** @deprecated Use `isWorkbenchSectionedPanelAtScrollEnd`. */
export function isWorkbenchSectionedPanelAtScrollBottom({
  bottomThreshold = WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD,
  clientHeight,
  scrollHeight,
  scrollTop,
}: {
  bottomThreshold?: number | undefined;
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}): boolean {
  return isWorkbenchSectionedPanelAtScrollEnd({
    bottomThreshold,
    clientSize: clientHeight,
    scrollPosition: scrollTop,
    scrollSize: scrollHeight,
  });
}

export function resolveWorkbenchSectionedPanelActiveAnchorFromIntersection({
  anchorOrder,
  entries,
  fallbackAnchorId,
}: {
  anchorOrder: readonly string[];
  entries: readonly WorkbenchSectionedPanelIntersectionEntry[];
  fallbackAnchorId?: string | undefined;
}): string | undefined {
  const intersectingAnchorIds = new Set(
    entries
      .filter((entry) => entry.isIntersecting && entry.target.id)
      .map((entry) => entry.target.id),
  );

  if (intersectingAnchorIds.size === 0) {
    return fallbackAnchorId;
  }

  let nextActive = fallbackAnchorId;

  for (const anchorId of anchorOrder) {
    if (intersectingAnchorIds.has(anchorId)) {
      nextActive = anchorId;
    }
  }

  return nextActive ?? fallbackAnchorId;
}

export function resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
  activeLineBias = WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_ACTIVE_LINE_BIAS,
  anchorOrder,
  clientSize,
  fallbackAnchorId,
  offset = WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  scrollPosition,
  scrollSize,
  sectionPositions,
}: {
  activeLineBias?: number | undefined;
  anchorOrder: readonly string[];
  clientSize: number;
  fallbackAnchorId?: string | undefined;
  offset?: number | undefined;
  scrollPosition: number;
  scrollSize: number;
  sectionPositions: readonly WorkbenchSectionedPanelScrollPosition[];
}): string | undefined {
  if (sectionPositions.length === 0) return fallbackAnchorId;

  const firstAnchorId = anchorOrder[0];
  const lastAnchorId = anchorOrder[anchorOrder.length - 1];

  if (isWorkbenchSectionedPanelAtScrollStart({ scrollPosition })) {
    return firstAnchorId ?? fallbackAnchorId;
  }

  if (
    isWorkbenchSectionedPanelAtScrollEnd({
      clientSize,
      scrollPosition,
      scrollSize,
    })
  ) {
    return lastAnchorId ?? fallbackAnchorId;
  }

  const activeLine = scrollPosition + offset + activeLineBias;
  let nextActive = sectionPositions[0]?.anchorId ?? fallbackAnchorId;

  for (const section of sectionPositions) {
    if (section.start <= activeLine) {
      nextActive = section.anchorId;
    }
  }

  return nextActive ?? fallbackAnchorId;
}

export function shouldPreserveNavClickActiveAnchor({
  pinnedScrollPosition,
  pinnedScrollSize,
  scrollPosition,
  scrollSize,
  threshold = WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD,
}: {
  pinnedScrollPosition: number;
  pinnedScrollSize: number;
  scrollPosition: number;
  scrollSize: number;
  threshold?: number | undefined;
}): boolean {
  return (
    Math.abs(scrollPosition - pinnedScrollPosition) <= threshold && scrollSize === pinnedScrollSize
  );
}

export function resolveWorkbenchSectionedPanelScrollTarget({
  offset = WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  sectionStart,
}: {
  offset?: number | undefined;
  sectionStart: number;
}): number {
  return Math.max(0, sectionStart - offset);
}

/** @deprecated Use `resolveWorkbenchSectionedPanelScrollTarget`. */
export function resolveWorkbenchSectionedPanelScrollTop({
  offset = WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  sectionTop,
}: {
  offset?: number | undefined;
  sectionTop: number;
}): number {
  return resolveWorkbenchSectionedPanelScrollTarget({ offset, sectionStart: sectionTop });
}

export function createWorkbenchSectionedPanelIntersectionRootMargin(
  offset = WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  axis: WorkbenchSectionedPanelScrollSpyAxis = 'vertical',
) {
  if (axis === 'horizontal') {
    return `0px -55% 0px -${offset}px`;
  }

  return `-${offset}px 0px -55% 0px`;
}
