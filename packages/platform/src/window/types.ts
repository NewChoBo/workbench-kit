/** Axis-aligned rectangle in absolute coordinates (screen or work-area space). */
export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Persisted main-window geometry.
 * When maximized, `bounds` must be the restore (normal) bounds.
 */
export interface RememberedWindowState {
  bounds: RectLike;
  isMaximized: boolean;
}

/** Display DTO with a work area; optional primary flag for default placement. */
export interface DisplayWorkArea {
  workArea: RectLike;
  isPrimary?: boolean;
}

/**
 * Narrow window surface for bounds persistence (Electron `BrowserWindow`-compatible).
 * Hosts inject a real window; unit tests use a fake.
 */
export interface PersistableWindow {
  getBounds(): RectLike;
  getNormalBounds(): RectLike;
  isDestroyed(): boolean;
  isMaximized(): boolean;
  on(
    event: 'close' | 'closed' | 'maximize' | 'move' | 'resize' | 'unmaximize',
    listener: () => void,
  ): void;
}

export type ResizeEdge =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface ResizeRectOptions {
  minWidth?: number;
  minHeight?: number;
}

/** Unit for work-area–relative placement offsets and sizes. */
export type SizeUnit = 'pixels' | 'percentage';

/**
 * Placement relative to a display work area.
 * When `unit` is `percentage`, `x`/`y`/`width`/`height` are percentages of the
 * work area (0–100), not fractions.
 */
export interface WorkAreaPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: SizeUnit;
}
