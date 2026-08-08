const SIDEBAR_LAYOUT_REFERENCE_WIDTH_PX = 1200;

export const WORKBENCH_HOST_PRIMARY_SIDEBAR_MIN_PX = 200;
export const WORKBENCH_HOST_PRIMARY_SIDEBAR_MAX_PX = 480;

export function clampWorkbenchHostPrimarySidebarSizePx(sizePx: number): number {
  if (!Number.isFinite(sizePx)) {
    return WORKBENCH_HOST_PRIMARY_SIDEBAR_MIN_PX;
  }
  return Math.min(
    WORKBENCH_HOST_PRIMARY_SIDEBAR_MAX_PX,
    Math.max(WORKBENCH_HOST_PRIMARY_SIDEBAR_MIN_PX, Math.round(sizePx)),
  );
}

export function workbenchHostPrimarySidebarSizePxFromPercent(
  sizePercent: number | undefined,
): number {
  const percent = Number.isFinite(sizePercent) ? (sizePercent as number) : 20;
  return clampWorkbenchHostPrimarySidebarSizePx(
    (percent / 100) * SIDEBAR_LAYOUT_REFERENCE_WIDTH_PX,
  );
}

export function workbenchHostPrimarySidebarSizePercentFromPx(sizePx: number): number {
  return (clampWorkbenchHostPrimarySidebarSizePx(sizePx) / SIDEBAR_LAYOUT_REFERENCE_WIDTH_PX) * 100;
}
