/**
 * Narrow applicator for secondary-window residency modes.
 * Inject a host window surface — no Electron types in the public API.
 *
 * Pair with renderer hit-region pointer passthrough
 * (`@workbench-kit/react` `usePointerPassthroughRegion`) for dynamic
 * `transparent` / `controls` pointer policies.
 *
 * `zOrder: 'back'` is an approximation via `setFocusable(false)` + `blur()` —
 * kit does not claim a native always-on-bottom window API.
 *
 */

export type WindowZOrder = 'top' | 'default' | 'back';

/**
 * Orthogonal pointer policy for secondary windows.
 * - `off` — never ignore mouse
 * - `all` — always ignore mouse (unless position edit mode)
 * - `transparent` / `controls` — ignore only when `dynamicPointerPassthrough` is true
 *   (host owns hit-region selectors; kit only applies the ignore flag)
 */
export type WindowPointerPassthroughPolicy = 'off' | 'all' | 'transparent' | 'controls';

export interface FocusableWindowSurface {
  setFocusable(value: boolean): void;
  setSkipTaskbar?: (skip: boolean) => void;
}

export interface ApplyWindowFocusablePolicyInput {
  readonly focusable: boolean;
  readonly skipTaskbar?: boolean;
}

/** Apply focusability before re-asserting optional taskbar visibility. */
export function applyWindowFocusablePolicy(
  windowSurface: FocusableWindowSurface,
  input: ApplyWindowFocusablePolicyInput,
): void {
  const setSkipTaskbar = windowSurface.setSkipTaskbar;
  if (input.skipTaskbar !== undefined && !setSkipTaskbar) {
    throw new Error('Window surface does not support taskbar visibility changes.');
  }

  windowSurface.setFocusable(input.focusable);
  if (input.skipTaskbar !== undefined) {
    windowSurface.setSkipTaskbar!(input.skipTaskbar);
  }
}

export interface ResidencyWindowSurface extends FocusableWindowSurface {
  setAlwaysOnTop(value: boolean, level?: string): void;
  setIgnoreMouseEvents(ignore: boolean, options?: { forward?: boolean }): void;
  blur?: () => void;
}

export interface ApplyWindowResidencyPolicyInput {
  readonly zOrder: WindowZOrder;
  readonly pointerPassthrough: WindowPointerPassthroughPolicy;
  readonly positionMode?: boolean;
  readonly dynamicPointerPassthrough?: boolean;
  /**
   * When ignoring mouse events, pass `{ forward: true }` to the surface.
   * Prefer an explicit capability flag over raw OS strings. Defaults to `true`.
   */
  readonly forwardPointerWhenIgnoring?: boolean;
  /** Optional always-on-top level string when effective z-order is `top`. */
  readonly alwaysOnTopLevel?: string;
  /**
   * Optional taskbar visibility policy, applied after `setFocusable` because some
   * native window implementations reset taskbar visibility when focusability changes.
   */
  readonly skipTaskbar?: boolean;
}

/**
 * Applies orthogonal z-order + pointer residency to an injected window surface.
 * Hosts own which policy is active and BrowserWindow construction; kit owns apply order.
 */
export function applyWindowResidencyPolicy(
  windowSurface: ResidencyWindowSurface,
  input: ApplyWindowResidencyPolicyInput,
): void {
  const positionMode = input.positionMode ?? false;
  const dynamicPointerPassthrough = input.dynamicPointerPassthrough ?? false;
  const forward = input.forwardPointerWhenIgnoring ?? true;
  const level = input.alwaysOnTopLevel;
  const setSkipTaskbar = windowSurface.setSkipTaskbar;
  if (input.skipTaskbar !== undefined && !setSkipTaskbar) {
    throw new Error('Window surface does not support taskbar visibility changes.');
  }

  const effectiveZOrder: WindowZOrder =
    positionMode && input.zOrder === 'back' ? 'default' : input.zOrder;

  if (effectiveZOrder === 'top') {
    if (level === undefined) {
      windowSurface.setAlwaysOnTop(true);
    } else {
      windowSurface.setAlwaysOnTop(true, level);
    }
  } else {
    windowSurface.setAlwaysOnTop(false);
  }

  applyWindowFocusablePolicy(
    windowSurface,
    input.skipTaskbar === undefined
      ? { focusable: effectiveZOrder !== 'back' }
      : { focusable: effectiveZOrder !== 'back', skipTaskbar: input.skipTaskbar },
  );

  if (effectiveZOrder === 'back') {
    windowSurface.blur?.();
  }

  const ignoreMouse =
    !positionMode &&
    (input.pointerPassthrough === 'all' ||
      ((input.pointerPassthrough === 'transparent' || input.pointerPassthrough === 'controls') &&
        dynamicPointerPassthrough));

  if (!ignoreMouse) {
    windowSurface.setIgnoreMouseEvents(false);
    return;
  }

  if (forward) {
    windowSurface.setIgnoreMouseEvents(true, { forward: true });
    return;
  }

  windowSurface.setIgnoreMouseEvents(true);
}
