import { clampWindowBoundsToDisplays } from './clamp-window-bounds-to-displays.js';
import type { DisplayWorkArea, RectLike, RememberedWindowState } from './types.js';

/** Default restored size before capping to the primary work area. */
export const DEFAULT_WINDOW_OPEN_WIDTH = 1200;
export const DEFAULT_WINDOW_OPEN_HEIGHT = 800;

export interface ResolveWindowOpenLayoutInput {
  saved: RememberedWindowState | null;
  displays: readonly DisplayWorkArea[];
  defaults?: RectLike;
  remember: boolean;
}

export interface ResolvedWindowOpenLayout {
  bounds: RectLike;
  isMaximized: boolean;
}

function resolvePrimaryWorkArea(displays: readonly DisplayWorkArea[]): RectLike | null {
  if (displays.length === 0) {
    return null;
  }
  return (displays.find((display) => display.isPrimary) ?? displays[0]!).workArea;
}

/** Center a default-sized window on the primary display work area. */
export function createDefaultWindowOpenBounds(displays: readonly DisplayWorkArea[]): RectLike {
  const workArea = resolvePrimaryWorkArea(displays);
  if (!workArea) {
    return {
      x: 0,
      y: 0,
      width: DEFAULT_WINDOW_OPEN_WIDTH,
      height: DEFAULT_WINDOW_OPEN_HEIGHT,
    };
  }

  const width = Math.min(DEFAULT_WINDOW_OPEN_WIDTH, workArea.width);
  const height = Math.min(DEFAULT_WINDOW_OPEN_HEIGHT, workArea.height);
  return {
    x: workArea.x + Math.round((workArea.width - width) / 2),
    y: workArea.y + Math.round((workArea.height - height) / 2),
    width,
    height,
  };
}

/**
 * Resolve initial BrowserWindow bounds/maximize from optional remembered state.
 * When `remember` is false or `saved` is null, returns defaults without requiring
 * callers to wipe persisted storage.
 */
export function resolveWindowOpenLayout(
  input: ResolveWindowOpenLayoutInput,
): ResolvedWindowOpenLayout {
  const defaults = input.defaults ?? createDefaultWindowOpenBounds(input.displays);

  if (!input.remember || input.saved === null) {
    return { bounds: defaults, isMaximized: false };
  }

  return {
    bounds: clampWindowBoundsToDisplays(input.saved.bounds, input.displays),
    isMaximized: input.saved.isMaximized,
  };
}
