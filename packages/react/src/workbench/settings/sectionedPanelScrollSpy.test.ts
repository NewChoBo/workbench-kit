import { describe, expect, it } from 'vitest';
import {
  WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_ACTIVE_LINE_BIAS,
  WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET,
  WORKBENCH_SECTIONED_PANEL_PROGRAMMATIC_SCROLL_SETTLE_MS_INSTANT,
  WORKBENCH_SECTIONED_PANEL_PROGRAMMATIC_SCROLL_SETTLE_MS_SMOOTH,
  createWorkbenchSectionedPanelIntersectionRootMargin,
  isWorkbenchSectionedPanelAtScrollEnd,
  isWorkbenchSectionedPanelAtScrollStart,
  isWorkbenchSectionedPanelScrollable,
  readWorkbenchSectionedPanelScrollMetrics,
  resolveWorkbenchSectionedPanelActiveAnchorFromScroll,
  resolveWorkbenchSectionedPanelClampedScrollTarget,
  resolveWorkbenchSectionedPanelProgrammaticScrollSettleMs,
  resolveWorkbenchSectionedPanelScrollTarget,
  shouldPreserveNavClickActiveAnchor,
} from './sectionedPanelScrollSpy';

describe('sectionedPanelScrollSpy', () => {
  const anchorOrder = ['general', 'request', 'response'];

  it('detects when the content panel can scroll', () => {
    expect(isWorkbenchSectionedPanelScrollable({ clientSize: 400, scrollSize: 900 })).toBe(true);
    expect(isWorkbenchSectionedPanelScrollable({ clientSize: 600, scrollSize: 400 })).toBe(false);
  });

  it('reads scroll metrics for vertical and horizontal axes', () => {
    const element = {
      clientHeight: 400,
      scrollHeight: 900,
      scrollTop: 120,
      clientWidth: 300,
      scrollWidth: 1200,
      scrollLeft: 80,
    } as HTMLElement;

    expect(readWorkbenchSectionedPanelScrollMetrics(element, 'vertical')).toEqual({
      clientSize: 400,
      scrollSize: 900,
      scrollPosition: 120,
    });
    expect(readWorkbenchSectionedPanelScrollMetrics(element, 'horizontal')).toEqual({
      clientSize: 300,
      scrollSize: 1200,
      scrollPosition: 80,
    });
  });

  it('detects when the scroll position is at the start or end', () => {
    expect(isWorkbenchSectionedPanelAtScrollStart({ scrollPosition: 0 })).toBe(true);
    expect(isWorkbenchSectionedPanelAtScrollStart({ scrollPosition: 2 })).toBe(true);
    expect(isWorkbenchSectionedPanelAtScrollStart({ scrollPosition: 3 })).toBe(false);

    expect(
      isWorkbenchSectionedPanelAtScrollEnd({
        clientSize: 200,
        scrollSize: 900,
        scrollPosition: 700,
      }),
    ).toBe(true);
  });

  it('scrolls a section to the configured offset', () => {
    expect(resolveWorkbenchSectionedPanelScrollTarget({ sectionStart: 320 })).toBe(296);
    expect(resolveWorkbenchSectionedPanelScrollTarget({ offset: 24, sectionStart: 10 })).toBe(0);
  });

  it('builds the intersection observer root margin per axis', () => {
    expect(createWorkbenchSectionedPanelIntersectionRootMargin()).toBe('-24px 0px -55% 0px');
    expect(createWorkbenchSectionedPanelIntersectionRootMargin(24, 'horizontal')).toBe(
      '0px -55% 0px -24px',
    );
  });

  it('resolves the active section from scroll position with active-line bias', () => {
    const sections = [
      { anchorId: 'general', start: 48, end: 280 },
      { anchorId: 'request', start: 320, end: 680 },
      { anchorId: 'response', start: 720, end: 960 },
    ];

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder,
        clientSize: 400,
        fallbackAnchorId: 'general',
        scrollSize: 1200,
        scrollPosition: 0,
        sectionPositions: sections,
      }),
    ).toBe('general');

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder,
        clientSize: 400,
        fallbackAnchorId: 'general',
        scrollSize: 1200,
        scrollPosition: 330,
        sectionPositions: sections,
      }),
    ).toBe('request');

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder,
        clientSize: 400,
        fallbackAnchorId: 'general',
        scrollSize: 1200,
        scrollPosition: 800,
        sectionPositions: sections,
      }),
    ).toBe('response');
  });

  it('uses the vue3-style active line offset when resolving sections', () => {
    const sections = [
      { anchorId: 'general', start: 48, end: 280 },
      { anchorId: 'request', start: 320, end: 680 },
    ];

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder: ['general', 'request'],
        clientSize: 400,
        fallbackAnchorId: 'general',
        scrollSize: 900,
        scrollPosition:
          320 -
          WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET -
          WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_ACTIVE_LINE_BIAS -
          1,
        sectionPositions: sections,
      }),
    ).toBe('general');

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder: ['general', 'request'],
        clientSize: 400,
        fallbackAnchorId: 'general',
        scrollSize: 900,
        scrollPosition:
          320 -
          WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_OFFSET -
          WORKBENCH_SECTIONED_PANEL_SCROLL_SPY_ACTIVE_LINE_BIAS,
        sectionPositions: sections,
      }),
    ).toBe('request');
  });

  it('activates the last section at scroll bottom (scroll-spy parity)', () => {
    const sections = [
      { anchorId: 'general', start: 48, end: 280 },
      { anchorId: 'request', start: 1400, end: 1500 },
      { anchorId: 'response', start: 1500, end: 1560 },
    ];

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder,
        clientSize: 600,
        fallbackAnchorId: 'general',
        scrollSize: 2000,
        scrollPosition: 1400,
        sectionPositions: sections,
      }),
    ).toBe('response');
  });

  it('does not lock an earlier section when active line falls inside its height span', () => {
    const anchorOrderWithAttach = ['general', 'attach', 'batch', 'request', 'response'] as const;
    const sections = [
      { anchorId: 'general', start: 48, end: 280 },
      { anchorId: 'attach', start: 800, end: 2400 },
      { anchorId: 'batch', start: 2400, end: 2600 },
      { anchorId: 'request', start: 2600, end: 2800 },
      { anchorId: 'response', start: 2800, end: 2900 },
    ];

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder: anchorOrderWithAttach,
        clientSize: 600,
        fallbackAnchorId: 'general',
        offset: 80,
        scrollSize: 2900,
        scrollPosition: 2300,
        sectionPositions: sections,
      }),
    ).toBe('response');
  });

  it('activates a short last section when it is visible only at scroll bottom', () => {
    const sections = [
      { anchorId: 'general', start: 48, end: 280 },
      { anchorId: 'request', start: 320, end: 680 },
      { anchorId: 'response', start: 1150, end: 1200 },
    ];

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder,
        clientSize: 400,
        fallbackAnchorId: 'general',
        scrollSize: 1200,
        scrollPosition: 800,
        sectionPositions: sections,
      }),
    ).toBe('response');
  });

  it('resolves the active section along a horizontal scroll axis', () => {
    const sections = [
      { anchorId: 'general', start: 40, end: 260 },
      { anchorId: 'request', start: 300, end: 620 },
      { anchorId: 'response', start: 660, end: 900 },
    ];

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorFromScroll({
        anchorOrder,
        clientSize: 320,
        fallbackAnchorId: 'general',
        scrollSize: 1000,
        scrollPosition: 340,
        sectionPositions: sections,
      }),
    ).toBe('request');
  });

  it('resolves programmatic scroll settle timing from scroll behavior', () => {
    expect(resolveWorkbenchSectionedPanelProgrammaticScrollSettleMs('smooth')).toBe(
      WORKBENCH_SECTIONED_PANEL_PROGRAMMATIC_SCROLL_SETTLE_MS_SMOOTH,
    );
    expect(resolveWorkbenchSectionedPanelProgrammaticScrollSettleMs('auto')).toBe(
      WORKBENCH_SECTIONED_PANEL_PROGRAMMATIC_SCROLL_SETTLE_MS_INSTANT,
    );
    expect(resolveWorkbenchSectionedPanelProgrammaticScrollSettleMs('instant')).toBe(
      WORKBENCH_SECTIONED_PANEL_PROGRAMMATIC_SCROLL_SETTLE_MS_INSTANT,
    );
  });

  it('clamps scroll targets to the maximum scroll position', () => {
    expect(
      resolveWorkbenchSectionedPanelClampedScrollTarget({
        clientSize: 600,
        scrollSize: 2900,
        targetScrollPosition: 2800,
      }),
    ).toBe(2300);
  });

  it('preserves nav click focus when scroll position and content size are unchanged', () => {
    expect(
      shouldPreserveNavClickActiveAnchor({
        pinnedScrollPosition: 1400,
        pinnedScrollSize: 2000,
        scrollPosition: 1400,
        scrollSize: 2000,
      }),
    ).toBe(true);

    expect(
      shouldPreserveNavClickActiveAnchor({
        pinnedScrollPosition: 1400,
        pinnedScrollSize: 2000,
        scrollPosition: 330,
        scrollSize: 2000,
      }),
    ).toBe(false);

    expect(
      shouldPreserveNavClickActiveAnchor({
        pinnedScrollPosition: 1400,
        pinnedScrollSize: 2000,
        scrollPosition: 1400,
        scrollSize: 2100,
      }),
    ).toBe(false);
  });
});
