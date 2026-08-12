export interface PointerPassthroughPort {
  setPointerPassthrough(enabled: boolean): void | Promise<void>;
}

export interface PointerOverHitRegionOptions {
  readonly hitSelectors: readonly string[];
  readonly controlSelectors?: readonly string[];
  readonly root?: HTMLElement | null;
}

/**
 * Returns true when `target` matches any host-provided hit/control selector
 * (and, when `root` is set, lies inside that root).
 */
export function isPointerOverHitRegion(
  target: EventTarget | null,
  options: PointerOverHitRegionOptions,
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const root = options.root ?? null;
  if (root !== null && !root.contains(target)) {
    return false;
  }

  const selectors = [...options.hitSelectors, ...(options.controlSelectors ?? [])];
  for (const selector of selectors) {
    if (selector.length === 0) {
      continue;
    }
    if (target.closest(selector) !== null) {
      return true;
    }
  }
  return false;
}

export interface PointerPassthroughControllerOptions extends PointerOverHitRegionOptions {
  readonly enabled: boolean;
  readonly port: PointerPassthroughPort;
}

export interface PointerPassthroughController {
  handlePointerTarget(target: EventTarget | null): void;
  /** Force the next decision to notify the port even if unchanged. */
  reset(): void;
}

/**
 * Pure controller for overlay click-through: when the pointer is outside
 * host-provided selectors, ask the port to enable passthrough.
 * Pair with platform `applyWindowResidencyPolicy` on the main side.
 */
export function createPointerPassthroughController(
  options: PointerPassthroughControllerOptions,
): PointerPassthroughController {
  let lastPassthrough: boolean | null = null;

  return {
    reset() {
      lastPassthrough = null;
    },
    handlePointerTarget(target: EventTarget | null) {
      if (!options.enabled) {
        if (lastPassthrough !== false) {
          lastPassthrough = false;
          void options.port.setPointerPassthrough(false);
        }
        return;
      }

      const overHit = isPointerOverHitRegion(target, options);
      const passthrough = !overHit;
      if (passthrough === lastPassthrough) {
        return;
      }
      lastPassthrough = passthrough;
      void options.port.setPointerPassthrough(passthrough);
    },
  };
}
