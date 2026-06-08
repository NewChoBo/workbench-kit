export interface WorkbenchSectionedPanelScrollPosition {
  anchorId: string;
  top: number;
}

export function resolveWorkbenchSectionedPanelActiveAnchorId({
  bottomThreshold = 2,
  fallbackAnchorId,
  offset = 24,
  scrollHeight,
  scrollTop,
  sectionPositions,
  viewportHeight,
}: {
  bottomThreshold?: number;
  fallbackAnchorId?: string | undefined;
  offset?: number;
  scrollHeight: number;
  scrollTop: number;
  sectionPositions: readonly WorkbenchSectionedPanelScrollPosition[];
  viewportHeight: number;
}): string | undefined {
  if (sectionPositions.length === 0) return fallbackAnchorId;

  const activeLine = scrollTop + offset;
  let nextActive = sectionPositions[0]?.anchorId ?? fallbackAnchorId;

  for (const section of sectionPositions) {
    if (section.top <= activeLine) {
      nextActive = section.anchorId;
    }
  }

  const lastSection = sectionPositions[sectionPositions.length - 1];
  const isAtBottom = scrollTop + viewportHeight >= scrollHeight - bottomThreshold;
  const lastSectionWouldWin =
    lastSection !== undefined && lastSection.top <= activeLine;

  if (isAtBottom && lastSection !== undefined && !lastSectionWouldWin) {
    return lastSection.anchorId;
  }

  return nextActive;
}

export function resolveWorkbenchSectionedPanelScrollTop({
  offset = 18,
  sectionTop,
}: {
  offset?: number;
  sectionTop: number;
}): number {
  return Math.max(0, sectionTop - offset);
}
