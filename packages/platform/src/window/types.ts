/** Axis-aligned rectangle in screen coordinates. */
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
