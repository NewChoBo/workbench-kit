export {
  clampWindowBoundsToDisplays,
  selectWindowDisplayForBounds,
  type ClampWindowBoundsToDisplaysOptions,
  WINDOW_BOUNDS_MIN_HEIGHT,
  WINDOW_BOUNDS_MIN_WIDTH,
} from './clamp-window-bounds-to-displays.js';
export {
  createDefaultWindowOpenBounds,
  DEFAULT_WINDOW_OPEN_HEIGHT,
  DEFAULT_WINDOW_OPEN_WIDTH,
  resolveWindowOpenLayout,
  type DefaultWindowOpenBoundsOptions,
  type ResolvedWindowOpenLayout,
  type ResolveWindowOpenLayoutInput,
} from './resolve-window-open-layout.js';
export {
  assertPositiveWorkArea,
  normalizeBoundsToPlacement,
  resolvePlacementToBounds,
} from './work-area-placement.js';
export type {
  DisplayWorkArea,
  RectLike,
  RememberedWindowState,
  SizeUnit,
  WorkAreaPlacement,
} from './types.js';
