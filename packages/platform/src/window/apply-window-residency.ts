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

export interface ResolveWindowZOrderPolicyInput {
  readonly zOrder: WindowZOrder;
  readonly positionMode?: boolean;
  /** Whether the host can keep a window unfocused. This is not always-bottom support. */
  readonly supportsUnfocusableBack?: boolean;
}

/** Intended native policy, not compositor readback or proof of effective stacking. */
export interface WindowZOrderPolicy {
  readonly requestedZOrder: WindowZOrder;
  readonly effectiveZOrder: 'top' | 'default' | 'back-approximation';
  readonly focusable: boolean;
  readonly reason: null | 'back-approximation' | 'back-unavailable' | 'position-mode';
}

/** Omitted capability preserves the legacy unfocused approximation, never native always-bottom. */
export function resolveWindowZOrderPolicy(
  input: ResolveWindowZOrderPolicyInput,
): WindowZOrderPolicy {
  if (input.zOrder !== 'back') {
    return {
      requestedZOrder: input.zOrder,
      effectiveZOrder: input.zOrder,
      focusable: true,
      reason: null,
    };
  }
  if (input.positionMode) {
    return {
      requestedZOrder: 'back',
      effectiveZOrder: 'default',
      focusable: true,
      reason: 'position-mode',
    };
  }
  if (input.supportsUnfocusableBack === false) {
    return {
      requestedZOrder: 'back',
      effectiveZOrder: 'default',
      focusable: true,
      reason: 'back-unavailable',
    };
  }
  return {
    requestedZOrder: 'back',
    effectiveZOrder: 'back-approximation',
    focusable: false,
    reason: 'back-approximation',
  };
}

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

export interface ApplyWindowResidencyPolicyInput extends ResolveWindowZOrderPolicyInput {
  readonly pointerPassthrough: WindowPointerPassthroughPolicy;
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

  const policy = resolveWindowZOrderPolicy(input);

  if (policy.effectiveZOrder === 'top') {
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
      ? { focusable: policy.focusable }
      : { focusable: policy.focusable, skipTaskbar: input.skipTaskbar },
  );

  if (policy.effectiveZOrder === 'back-approximation') {
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
