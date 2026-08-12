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

export interface ResidencyWindowSurface {
  setAlwaysOnTop(value: boolean, level?: string): void;
  setFocusable(value: boolean): void;
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

  windowSurface.setFocusable(effectiveZOrder !== 'back');

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
