const OVERLAY_VIEWPORT_PADDING = 4;

export function clampFixedOverlayPosition(
  x: number,
  y: number,
  rect: Pick<DOMRect, 'width' | 'height'>,
): { x: number; y: number } {
  if (typeof window === 'undefined') {
    return { x, y };
  }

  return {
    x: Math.max(
      OVERLAY_VIEWPORT_PADDING,
      Math.min(x, window.innerWidth - rect.width - OVERLAY_VIEWPORT_PADDING),
    ),
    y: Math.max(
      OVERLAY_VIEWPORT_PADDING,
      Math.min(y, window.innerHeight - rect.height - OVERLAY_VIEWPORT_PADDING),
    ),
  };
}
