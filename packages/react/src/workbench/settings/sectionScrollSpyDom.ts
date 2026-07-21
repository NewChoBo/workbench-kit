import type { WorkbenchSectionedPanelScrollSpyAxis } from './sectionedPanelScrollSpy';
import { resolveWorkbenchSectionedPanelClampedScrollTarget } from './sectionedPanelScrollSpy';

export function findPanelSection(content: HTMLElement, anchorId: string) {
  return (
    Array.from(content.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.id === anchorId,
    ) ?? null
  );
}

export function readSectionStart(
  content: HTMLElement,
  section: HTMLElement,
  axis: WorkbenchSectionedPanelScrollSpyAxis,
) {
  if (axis === 'horizontal') {
    if (section.parentElement === content) {
      return section.offsetLeft;
    }

    const containerRect = content.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    return sectionRect.left - containerRect.left + content.scrollLeft;
  }

  if (section.parentElement === content) {
    return section.offsetTop;
  }

  const containerRect = content.getBoundingClientRect();
  const sectionRect = section.getBoundingClientRect();
  return sectionRect.top - containerRect.top + content.scrollTop;
}

function readSectionSpan(section: HTMLElement, axis: WorkbenchSectionedPanelScrollSpyAxis) {
  return axis === 'horizontal' ? section.offsetWidth : section.offsetHeight;
}

export function readSectionPositions(
  content: HTMLElement,
  anchorOrder: readonly string[],
  axis: WorkbenchSectionedPanelScrollSpyAxis,
) {
  return anchorOrder
    .map((anchorId) => {
      const section = findPanelSection(content, anchorId);
      if (!section) return null;

      const start = readSectionStart(content, section, axis);
      const span = readSectionSpan(section, axis);

      return {
        anchorId,
        start,
        end: start + span,
      };
    })
    .filter(
      (section): section is { anchorId: string; start: number; end: number } => section !== null,
    );
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

/** Fixed-duration scroll for section nav clicks (distance-independent, unlike native smooth). */
export function animateSectionPanelScrollTo({
  axis,
  durationMs,
  element,
  onComplete,
  target,
}: {
  axis: WorkbenchSectionedPanelScrollSpyAxis;
  durationMs: number;
  element: HTMLElement;
  onComplete: () => void;
  target: number;
}): () => void {
  const metrics =
    axis === 'horizontal'
      ? {
          clientSize: element.clientWidth,
          scrollSize: element.scrollWidth,
          scrollPosition: element.scrollLeft,
        }
      : {
          clientSize: element.clientHeight,
          scrollSize: element.scrollHeight,
          scrollPosition: element.scrollTop,
        };

  const clampedTarget = resolveWorkbenchSectionedPanelClampedScrollTarget({
    clientSize: metrics.clientSize,
    scrollSize: metrics.scrollSize,
    targetScrollPosition: target,
  });
  const start = metrics.scrollPosition;

  const writeScrollPosition = (value: number) => {
    if (axis === 'horizontal') {
      element.scrollLeft = value;
      return;
    }

    element.scrollTop = value;
  };

  if (durationMs <= 0 || Math.abs(clampedTarget - start) < 1) {
    writeScrollPosition(clampedTarget);
    onComplete();
    return () => {};
  }

  const startedAt = performance.now();
  let frameId = 0;

  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    writeScrollPosition(start + (clampedTarget - start) * easeOutCubic(progress));

    if (progress < 1) {
      frameId = requestAnimationFrame(tick);
      return;
    }

    onComplete();
  };

  frameId = requestAnimationFrame(tick);

  return () => {
    if (frameId) {
      cancelAnimationFrame(frameId);
    }
  };
}
