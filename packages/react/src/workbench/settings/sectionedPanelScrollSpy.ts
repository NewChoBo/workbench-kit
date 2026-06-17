export const WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET = 24;
export const WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD = 2;

export interface WorkbenchSectionedPanelIntersectionEntry {
  intersectionRatio: number;
  isIntersecting: boolean;
  target: { id: string };
}

export interface WorkbenchSectionedPanelScrollPosition {
  anchorId: string;
  top: number;
}

export function isWorkbenchSectionedPanelScrollable({
  clientHeight,
  scrollHeight,
  threshold = WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD,
}: {
  clientHeight: number;
  scrollHeight: number;
  threshold?: number;
}): boolean {
  return scrollHeight > clientHeight + threshold;
}

export function isWorkbenchSectionedPanelAtScrollTop({
  scrollTop,
  topThreshold = WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD,
}: {
  scrollTop: number;
  topThreshold?: number;
}): boolean {
  return scrollTop <= topThreshold;
}

export function isWorkbenchSectionedPanelAtScrollBottom({
  bottomThreshold = WORKBENCH_SECTIONED_PANEL_SCROLL_THRESHOLD,
  clientHeight,
  scrollHeight,
  scrollTop,
}: {
  bottomThreshold?: number;
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}): boolean {
  return scrollTop + clientHeight >= scrollHeight - bottomThreshold;
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
  anchorOrder,
  clientHeight,
  fallbackAnchorId,
  offset = WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  scrollHeight,
  scrollTop,
  sectionPositions,
}: {
  anchorOrder: readonly string[];
  clientHeight: number;
  fallbackAnchorId?: string | undefined;
  offset?: number;
  scrollHeight: number;
  scrollTop: number;
  sectionPositions: readonly WorkbenchSectionedPanelScrollPosition[];
}): string | undefined {
  if (sectionPositions.length === 0) return fallbackAnchorId;

  const firstAnchorId = anchorOrder[0];
  const lastAnchorId = anchorOrder[anchorOrder.length - 1];

  if (isWorkbenchSectionedPanelAtScrollTop({ scrollTop })) {
    return firstAnchorId ?? fallbackAnchorId;
  }

  if (
    isWorkbenchSectionedPanelAtScrollBottom({
      clientHeight,
      scrollHeight,
      scrollTop,
    })
  ) {
    return lastAnchorId ?? fallbackAnchorId;
  }

  const activeLine = scrollTop + offset;
  let nextActive = fallbackAnchorId;

  for (const section of sectionPositions) {
    if (section.top <= activeLine) {
      nextActive = section.anchorId;
    }
  }

  return nextActive ?? fallbackAnchorId;
}

export function resolveWorkbenchSectionedPanelScrollTop({
  offset = WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  sectionTop,
}: {
  offset?: number;
  sectionTop: number;
}): number {
  return Math.max(0, sectionTop - offset);
}

export function createWorkbenchSectionedPanelIntersectionRootMargin(
  offset = WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
) {
  return `-${offset}px 0px -55% 0px`;
}
