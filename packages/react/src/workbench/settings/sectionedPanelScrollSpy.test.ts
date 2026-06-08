import { describe, expect, it } from 'vitest';
import {
  resolveWorkbenchSectionedPanelActiveAnchorId,
  resolveWorkbenchSectionedPanelScrollTop,
} from './sectionedPanelScrollSpy';

describe('sectionedPanelScrollSpy', () => {
  const sections = [
    { anchorId: 'general', top: 0 },
    { anchorId: 'request', top: 320 },
    { anchorId: 'response', top: 720 },
  ];

  it('activates the last section when scrolled to the bottom', () => {
    expect(
      resolveWorkbenchSectionedPanelActiveAnchorId({
        scrollHeight: 900,
        scrollTop: 700,
        sectionPositions: sections,
        viewportHeight: 200,
      }),
    ).toBe('response');
  });

  it('activates the last section when content is shorter than the viewport', () => {
    expect(
      resolveWorkbenchSectionedPanelActiveAnchorId({
        scrollHeight: 400,
        scrollTop: 0,
        sectionPositions: sections,
        viewportHeight: 600,
      }),
    ).toBe('response');
  });

  it('activates the section whose top crossed the scroll offset', () => {
    expect(
      resolveWorkbenchSectionedPanelActiveAnchorId({
        scrollHeight: 1200,
        scrollTop: 300,
        sectionPositions: sections,
        viewportHeight: 400,
      }),
    ).toBe('request');
  });

  it('keeps intermediate sections active while scrolling through the middle', () => {
    expect(
      resolveWorkbenchSectionedPanelActiveAnchorId({
        scrollHeight: 1200,
        scrollTop: 100,
        sectionPositions: sections,
        viewportHeight: 400,
      }),
    ).toBe('general');

    expect(
      resolveWorkbenchSectionedPanelActiveAnchorId({
        scrollHeight: 1200,
        scrollTop: 500,
        sectionPositions: sections,
        viewportHeight: 400,
      }),
    ).toBe('request');
  });

  it('scrolls a section to the configured offset', () => {
    expect(resolveWorkbenchSectionedPanelScrollTop({ sectionTop: 320 })).toBe(302);
    expect(resolveWorkbenchSectionedPanelScrollTop({ offset: 18, sectionTop: 10 })).toBe(0);
  });
});
