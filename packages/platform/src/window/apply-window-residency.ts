/**
 * Narrow applicator for secondary-window residency modes.
 * Inject a host window surface — no Electron types in the public API.
 *
 * Pair with renderer hit-region pointer passthrough (#39) for click-through overlays.
 */

export type WindowResidencyMode = 'normal' | 'always-on-top' | 'click-through';

export interface ResidencyWindowSurface {
  setAlwaysOnTop(value: boolean, level?: string): void;
  setFocusable(value: boolean): void;
  setIgnoreMouseEvents(ignore: boolean, options?: { forward?: boolean }): void;
  blur?: () => void;
}

export interface ApplyWindowResidencyOptions {
  /**
   * When ignoring mouse events (click-through), forward move events to the window
   * so the renderer can still hit-test interactive regions. win32 hosts typically
   * want `forward: true`; other platforms may ignore the option.
   */
  readonly forwardPointerWhenIgnoring?: boolean;
  /** Optional always-on-top level string forwarded to the host surface. */
  readonly alwaysOnTopLevel?: string;
}

/**
 * Applies a residency mode sequence to an injected window surface.
 * Hosts own which mode is active and BrowserWindow construction; kit owns the apply order.
 */
export function applyWindowResidency(
  windowSurface: ResidencyWindowSurface,
  mode: WindowResidencyMode,
  options: ApplyWindowResidencyOptions = {},
): void {
  const forward = options.forwardPointerWhenIgnoring ?? true;
  const level = options.alwaysOnTopLevel;

  switch (mode) {
    case 'normal':
      windowSurface.setAlwaysOnTop(false);
      windowSurface.setFocusable(true);
      windowSurface.setIgnoreMouseEvents(false);
      return;
    case 'always-on-top':
      if (level === undefined) {
        windowSurface.setAlwaysOnTop(true);
      } else {
        windowSurface.setAlwaysOnTop(true, level);
      }
      windowSurface.setFocusable(true);
      windowSurface.setIgnoreMouseEvents(false);
      return;
    case 'click-through':
      if (level === undefined) {
        windowSurface.setAlwaysOnTop(true);
      } else {
        windowSurface.setAlwaysOnTop(true, level);
      }
      windowSurface.setFocusable(false);
      windowSurface.setIgnoreMouseEvents(true, { forward });
      windowSurface.blur?.();
      return;
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unsupported residency mode: ${String(_exhaustive)}`);
    }
  }
}
