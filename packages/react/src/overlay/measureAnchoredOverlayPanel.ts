import { clampNumber } from '../utils/clamp';

export type AnchoredOverlayPlacement = 'side' | 'below' | 'above';

export interface MeasureAnchoredOverlayPanelOptions {
  readonly panelWidthPx?: number;
  readonly viewportPaddingPx?: number;
  readonly anchorGapPx?: number;
  readonly maxHeightRatio?: number;
  readonly sidePreferTriggerLeftRatio?: number;
}

export interface AnchoredOverlayPanelRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly maxHeight: number;
  readonly placement: AnchoredOverlayPlacement;
}

const DEFAULT_PANEL_WIDTH_PX = 360;
const DEFAULT_VIEWPORT_PADDING_PX = 8;
const DEFAULT_ANCHOR_GAP_PX = 6;
const DEFAULT_MAX_HEIGHT_RATIO = 0.72;
const DEFAULT_SIDE_PREFER_TRIGGER_LEFT_RATIO = 0.42;
/** Assumed minimum panel height when clamping side placement into the viewport. */
const SIDE_MIN_VISIBLE_HEIGHT_PX = 240;
/** Prefer below when at least this many pixels are available under the trigger. */
const BELOW_MIN_SPACE_PX = 12;

/**
 * Measure a panel-sized overlay anchored to a trigger element.
 * Prefers a side flyout when the trigger sits in the left portion of the
 * viewport and there is room; otherwise places below or above.
 */
export function measureAnchoredOverlayPanel(
  trigger: HTMLElement,
  options: MeasureAnchoredOverlayPanelOptions = {},
): AnchoredOverlayPanelRect {
  const panelWidthPx = options.panelWidthPx ?? DEFAULT_PANEL_WIDTH_PX;
  const viewportPaddingPx = options.viewportPaddingPx ?? DEFAULT_VIEWPORT_PADDING_PX;
  const anchorGapPx = options.anchorGapPx ?? DEFAULT_ANCHOR_GAP_PX;
  const maxHeightRatio = options.maxHeightRatio ?? DEFAULT_MAX_HEIGHT_RATIO;
  const sidePreferTriggerLeftRatio =
    options.sidePreferTriggerLeftRatio ?? DEFAULT_SIDE_PREFER_TRIGGER_LEFT_RATIO;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const triggerRect = trigger.getBoundingClientRect();

  const maxHeight = Math.min(
    viewportHeight * maxHeightRatio,
    viewportHeight - viewportPaddingPx * 2,
  );
  const width = Math.min(panelWidthPx, viewportWidth - viewportPaddingPx * 2);

  const spaceRight = Math.max(0, viewportWidth - triggerRect.right - viewportPaddingPx);
  const spaceBelow = Math.max(0, viewportHeight - triggerRect.bottom - viewportPaddingPx);
  const spaceAbove = Math.max(0, triggerRect.top - viewportPaddingPx);

  const preferSide =
    triggerRect.left < sidePreferTriggerLeftRatio * viewportWidth && spaceRight >= width;

  if (preferSide) {
    const minVisibleHeight = Math.min(SIDE_MIN_VISIBLE_HEIGHT_PX, maxHeight);
    const top = clampNumber(
      triggerRect.top,
      viewportPaddingPx,
      viewportHeight - viewportPaddingPx - minVisibleHeight,
    );
    return {
      placement: 'side',
      top,
      left: triggerRect.right + anchorGapPx,
      width,
      maxHeight,
    };
  }

  // Align the panel's right edge toward the trigger's right, then clamp.
  const left = clampNumber(
    triggerRect.right - width,
    viewportPaddingPx,
    viewportWidth - viewportPaddingPx - width,
  );

  if (spaceBelow >= BELOW_MIN_SPACE_PX || spaceBelow >= spaceAbove) {
    return {
      placement: 'below',
      top: triggerRect.bottom + anchorGapPx,
      left,
      width,
      maxHeight,
    };
  }

  const aboveHeight = Math.min(maxHeight, spaceAbove);
  return {
    placement: 'above',
    top: triggerRect.top - anchorGapPx - aboveHeight,
    left,
    width,
    maxHeight,
  };
}
