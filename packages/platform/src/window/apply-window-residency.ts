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
 * Coarse `applyWindowResidency` modes remain for back-compat. Prefer
 * {@link applyWindowResidencyPolicy} for orthogonal z-order + pointer control.
 * Documented approximate mapping: `click-through` ≈ always-on-top + ignore-all
 * with focusable=false (not identical to `zOrder:'top' + pointerPassthrough:'all'`).
 */

export type WindowResidencyMode = 'normal' | 'always-on-top' | 'click-through';

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

/**
 * Applies a residency mode sequence to an injected window surface.
 * Hosts own which mode is active and BrowserWindow construction; kit owns the apply order.
 *
 * Prefer {@link applyWindowResidencyPolicy} for new hosts that need independent
 * z-order and pointer axes.
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
