import {
  clampWindowBoundsToDisplays,
  type ClampWindowBoundsToDisplaysOptions,
} from './clamp-window-bounds-to-displays.js';
import type { DisplayWorkArea, RectLike, RememberedWindowState } from './types.js';

/** Default restored size before capping to the primary work area. */
export const DEFAULT_WINDOW_OPEN_WIDTH = 1200;
export const DEFAULT_WINDOW_OPEN_HEIGHT = 800;

export interface DefaultWindowOpenBoundsOptions {
  readonly width?: number;
  readonly height?: number;
  readonly fallbackWorkArea?: RectLike;
}

export interface ResolveWindowOpenLayoutInput {
  saved: RememberedWindowState | null;
  displays: readonly DisplayWorkArea[];
  defaults?: RectLike;
  defaultBoundsOptions?: DefaultWindowOpenBoundsOptions;
  remember: boolean;
  clampOptions?: ClampWindowBoundsToDisplaysOptions;
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
export function createDefaultWindowOpenBounds(
  displays: readonly DisplayWorkArea[],
  options: DefaultWindowOpenBoundsOptions = {},
): RectLike {
  const width = options.width ?? DEFAULT_WINDOW_OPEN_WIDTH;
  const height = options.height ?? DEFAULT_WINDOW_OPEN_HEIGHT;
  if (!Number.isFinite(width) || !Number.isFinite(height) || !(width > 0) || !(height > 0)) {
    throw new Error('Default Window width and height must be finite positive numbers.');
  }
  const workArea = resolvePrimaryWorkArea(displays) ?? options.fallbackWorkArea ?? null;
  if (!workArea) {
    return {
      x: 0,
      y: 0,
      width,
      height,
    };
  }

  const fittedWidth = Math.min(width, workArea.width);
  const fittedHeight = Math.min(height, workArea.height);
  return {
    x: workArea.x + Math.round((workArea.width - fittedWidth) / 2),
    y: workArea.y + Math.round((workArea.height - fittedHeight) / 2),
    width: fittedWidth,
    height: fittedHeight,
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
  const defaults =
    input.defaults ?? createDefaultWindowOpenBounds(input.displays, input.defaultBoundsOptions);

  if (!input.remember || input.saved === null) {
    return { bounds: defaults, isMaximized: false };
  }

  return {
    bounds: clampWindowBoundsToDisplays(input.saved.bounds, input.displays, input.clampOptions),
    isMaximized: input.saved.isMaximized,
  };
}
