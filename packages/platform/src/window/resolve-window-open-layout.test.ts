import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WINDOW_OPEN_HEIGHT,
  DEFAULT_WINDOW_OPEN_WIDTH,
  resolveWindowOpenLayout,
} from './resolve-window-open-layout.js';
import type { DisplayWorkArea, RememberedWindowState } from './types.js';

const primary: DisplayWorkArea = {
  isPrimary: true,
  workArea: { x: 100, y: 50, width: 1600, height: 900 },
};

const saved: RememberedWindowState = {
  bounds: { x: -5000, y: -4000, width: 1100, height: 700 },
  isMaximized: true,
};

const defaults = { x: 200, y: 120, width: 1000, height: 640 };

describe('resolveWindowOpenLayout', () => {
  it('centers a default size on the primary work area when defaults are omitted', () => {
    expect(
      resolveWindowOpenLayout({
        saved: null,
        displays: [primary],
        remember: false,
      }),
    ).toEqual({
      bounds: {
        x: 100 + Math.round((1600 - DEFAULT_WINDOW_OPEN_WIDTH) / 2),
        y: 50 + Math.round((900 - DEFAULT_WINDOW_OPEN_HEIGHT) / 2),
        width: DEFAULT_WINDOW_OPEN_WIDTH,
        height: DEFAULT_WINDOW_OPEN_HEIGHT,
      },
      isMaximized: false,
    });
  });

  it('returns defaults with isMaximized false when remember is off even if saved exists', () => {
    expect(
      resolveWindowOpenLayout({
        saved,
        displays: [primary],
        defaults,
        remember: false,
      }),
    ).toEqual({
      bounds: defaults,
      isMaximized: false,
    });
  });

  it('returns defaults with isMaximized false when saved is null', () => {
    expect(
      resolveWindowOpenLayout({
        saved: null,
        displays: [primary],
        defaults,
        remember: true,
      }),
    ).toEqual({
      bounds: defaults,
      isMaximized: false,
    });
  });

  it('centers host defaults within an injected fallback work area', () => {
    expect(
      resolveWindowOpenLayout({
        defaultBoundsOptions: {
          fallbackWorkArea: { x: 0, y: 0, width: 1280, height: 800 },
          height: 800,
          width: 1200,
        },
        displays: [],
        remember: false,
        saved: null,
      }),
    ).toEqual({
      bounds: { x: 40, y: 0, width: 1200, height: 800 },
      isMaximized: false,
    });
  });

  it('clamps saved bounds and preserves isMaximized when remember is on', () => {
    expect(
      resolveWindowOpenLayout({
        saved,
        displays: [primary],
        defaults,
        remember: true,
      }),
    ).toEqual({
      bounds: {
        x: 100,
        y: 50,
        width: 1100,
        height: 700,
      },
      isMaximized: true,
    });
  });

  it('forwards host-owned clamp policy for remembered bounds', () => {
    const secondary: DisplayWorkArea = {
      workArea: { x: 1700, y: 50, width: 1200, height: 800 },
    };

    expect(
      resolveWindowOpenLayout({
        clampOptions: {
          minHeight: 0,
          minWidth: 0,
        },
        displays: [primary, secondary],
        remember: true,
        saved: {
          bounds: { x: 4000, y: 100, width: 80, height: 60 },
          isMaximized: false,
        },
      }),
    ).toEqual({
      bounds: { x: 2820, y: 100, width: 80, height: 60 },
      isMaximized: false,
    });
  });
});
