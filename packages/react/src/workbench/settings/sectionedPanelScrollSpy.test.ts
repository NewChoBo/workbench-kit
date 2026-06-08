import { describe, expect, it } from 'vitest';
import {
  createWorkbenchSectionedPanelIntersectionRootMargin,
  isWorkbenchSectionedPanelAtScrollBottom,
  isWorkbenchSectionedPanelAtScrollTop,
  isWorkbenchSectionedPanelScrollable,
  resolveWorkbenchSectionedPanelActiveAnchorFromIntersection,
  resolveWorkbenchSectionedPanelActiveAnchorFromScroll,
  resolveWorkbenchSectionedPanelScrollTop,
} from './sectionedPanelScrollSpy';

describe('sectionedPanelScrollSpy', () => {
  const anchorOrder = ['general', 'request', 'response'];

  it('detects when the content panel can scroll', () => {
    expect(isWorkbenchSectionedPanelScrollable({ clientHeight: 400, scrollHeight: 900 })).toBe(
      true,
    );
    expect(isWorkbenchSectionedPanelScrollable({ clientHeight: 600, scrollHeight: 400 })).toBe(
      false,
    );
  });

  it('detects when the scroll position is at the top or bottom', () => {
    expect(isWorkbenchSectionedPanelAtScrollTop({ scrollTop: 0 })).toBe(true);
    expect(isWorkbenchSectionedPanelAtScrollTop({ scrollTop: 2 })).toBe(true);
    expect(isWorkbenchSectionedPanelAtScrollTop({ scrollTop: 3 })).toBe(false);

    expect(
      isWorkbenchSectionedPanelAtScrollBottom({
        clientHeight: 200,
        scrollHeight: 900,
        scrollTop: 700,
      }),
    ).toBe(true);
  });

  it('activates the last intersecting section in document order', () => {
    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromIntersection({
        anchorOrder,
        entries: [
          { intersectionRatio: 1, isIntersecting: true, target: { id: 'general' } },
          { intersectionRatio: 0.4, isIntersecting: true, target: { id: 'request' } },
        ],
        fallbackAnchorId: 'general',
      }),
    ).toBe('request');
  });

  it('falls back when no section intersects the active band', () => {
    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromIntersection({
        anchorOrder,
        entries: [{ intersectionRatio: 0, isIntersecting: false, target: { id: 'general' } }],
        fallbackAnchorId: 'general',
      }),
    ).toBe('general');
  });

  it('scrolls a section to the configured offset', () => {
    expect(resolveWorkbenchSectionedPanelScrollTop({ sectionTop: 320 })).toBe(296);
    expect(resolveWorkbenchSectionedPanelScrollTop({ offset: 24, sectionTop: 10 })).toBe(0);
  });

  it('builds the intersection observer root margin', () => {
    expect(createWorkbenchSectionedPanelIntersectionRootMargin()).toBe('-24px 0px -55% 0px');
  });

  it('resolves the active section from scroll position', () => {
    const sections = [
      { anchorId: 'general', top: 48 },
      { anchorId: 'request', top: 320 },
      { anchorId: 'response', top: 720 },
    ];

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder,
        clientHeight: 400,
        fallbackAnchorId: 'general',
        scrollHeight: 1200,
        scrollTop: 0,
        sectionPositions: sections,
      }),
    ).toBe('general');

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder,
        clientHeight: 400,
        fallbackAnchorId: 'general',
        scrollHeight: 1200,
        scrollTop: 330,
        sectionPositions: sections,
      }),
    ).toBe('request');

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder,
        clientHeight: 400,
        fallbackAnchorId: 'general',
        scrollHeight: 1200,
        scrollTop: 800,
        sectionPositions: sections,
      }),
    ).toBe('response');
  });
});
