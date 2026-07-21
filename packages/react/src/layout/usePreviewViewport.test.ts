/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  clampPreviewViewportZoom,
  computePreviewViewportFitScale,
  computeZoomPanTowardPoint,
  shouldStartPreviewViewportPan,
} from './usePreviewViewport';

describe('usePreviewViewport helpers', () => {
  it('clamps zoom between configured bounds', () => {
    expect(clampPreviewViewportZoom(0.1, 0.2, 6)).toBe(0.2);
    expect(clampPreviewViewportZoom(8, 0.2, 6)).toBe(6);
    expect(clampPreviewViewportZoom(1.5, 0.2, 6)).toBe(1.5);
  });

  it('computes fit scale to contain content inside the viewport', () => {
    expect(
      computePreviewViewportFitScale(
        { width: 960, height: 640 },
        { width: 1920, height: 1080 },
        48,
      ),
    ).toBeCloseTo(0.475, 2);

    expect(
      computePreviewViewportFitScale({ width: 400, height: 300 }, { width: 200, height: 100 }, 0),
    ).toBe(1);
  });

  it('returns unit fit scale for unmeasured viewports so callers can ignore zero sizes', () => {
    expect(
      computePreviewViewportFitScale({ width: 0, height: 0 }, { width: 1920, height: 1080 }, 48),
    ).toBe(1);
    expect(
      computePreviewViewportFitScale({ width: 960, height: 0 }, { width: 1920, height: 1080 }, 48),
    ).toBe(1);
  });

  it('keeps the cursor point stable when zooming toward a point', () => {
    const nextPan = computeZoomPanTowardPoint({
      currentPan: { x: 10, y: -20 },
      currentZoom: 1,
      nextZoom: 2,
      pointFromCenter: { x: 100, y: 50 },
    });

    expect(nextPan.x).toBeCloseTo(100 - 2 * (100 - 10), 6);
    expect(nextPan.y).toBeCloseTo(50 - 2 * (50 - -20), 6);
  });

  it('allows drag pan from non-interactive surface targets', () => {
    const target = document.createElement('div');
    const image = document.createElement('img');

    expect(
      shouldStartPreviewViewportPan({
        button: 0,
        pointerType: 'mouse',
        target,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(true);
    expect(
      shouldStartPreviewViewportPan({
        button: 0,
        pointerType: 'mouse',
        target: image,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(true);
  });

  it('blocks drag pan from interactive controls unless ignored', () => {
    const button = document.createElement('button');
    const icon = document.createElement('span');
    button.append(icon);
    const filterOverlay = document.createElement('div');
    filterOverlay.setAttribute('data-library-filter-overlay', 'true');
    const filterInput = document.createElement('input');
    filterOverlay.append(filterInput);

    expect(
      shouldStartPreviewViewportPan({
        button: 0,
        pointerType: 'mouse',
        target: icon,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(false);

    expect(
      shouldStartPreviewViewportPan({
        button: 0,
        pointerType: 'mouse',
        target: filterInput,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(false);

    expect(
      shouldStartPreviewViewportPan(
        {
          button: 0,
          pointerType: 'mouse',
          target: icon,
        } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>,
        { ignoreInteractiveTargets: true },
      ),
    ).toBe(true);
  });

  it('allows touch/pen drag pan when button is reported as -1', () => {
    const target = document.createElement('div');

    expect(
      shouldStartPreviewViewportPan({
        button: -1,
        pointerType: 'touch',
        target,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(true);
    expect(
      shouldStartPreviewViewportPan({
        button: -1,
        pointerType: 'pen',
        target,
      } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>),
    ).toBe(true);
  });

  it('can restrict pan to middle-mouse for interactive authoring canvases', () => {
    const target = document.createElement('div');

    expect(
      shouldStartPreviewViewportPan(
        {
          button: 0,
          pointerType: 'mouse',
          target,
        } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>,
        { enablePrimaryPointerPan: false },
      ),
    ).toBe(false);
    expect(
      shouldStartPreviewViewportPan(
        {
          button: 1,
          pointerType: 'mouse',
          target,
        } as Pick<PointerEvent, 'button' | 'pointerType' | 'target'>,
        { enablePrimaryPointerPan: false },
      ),
    ).toBe(true);
  });
});
