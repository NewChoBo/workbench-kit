import { useEffect, useRef, type RefObject } from 'react';

import {
  createPointerPassthroughController,
  type PointerPassthroughPort,
} from './pointerPassthroughRegion';

export interface UsePointerPassthroughRegionOptions {
  readonly enabled: boolean;
  readonly port: PointerPassthroughPort;
  /** Host-provided CSS selectors for interactive hit regions. */
  readonly hitSelectors: readonly string[];
  /** Optional extra control chrome selectors (also treated as hit). */
  readonly controlSelectors?: readonly string[];
  /** Limit hit-testing to a subtree; defaults to the document. */
  readonly rootRef?: RefObject<HTMLElement | null>;
}

/**
 * Toggles host pointer passthrough from renderer hit-testing.
 * Uses `requestAnimationFrame` coalescing for pointermove; no product selectors in kit.
 *
 * Host responsibilities:
 * - Provide selector lists
 * - Implement `port.setPointerPassthrough` (usually IPC → ignore-mouse-events)
 * - Pair with platform residency applicator for the main-process half
 */
export function usePointerPassthroughRegion(options: UsePointerPassthroughRegionOptions): void {
  const {
    enabled,
    port,
    hitSelectors,
    controlSelectors,
    rootRef,
  } = options;

  const portRef = useRef(port);
  portRef.current = port;
  const hitSelectorsRef = useRef(hitSelectors);
  hitSelectorsRef.current = hitSelectors;
  const controlSelectorsRef = useRef(controlSelectors);
  controlSelectorsRef.current = controlSelectors;

  useEffect(() => {
    const controller = createPointerPassthroughController({
      enabled,
      port: {
        setPointerPassthrough: (value) => portRef.current.setPointerPassthrough(value),
      },
      get hitSelectors() {
        return hitSelectorsRef.current;
      },
      get controlSelectors() {
        return controlSelectorsRef.current;
      },
      get root() {
        return rootRef?.current ?? null;
      },
    });

    if (!enabled) {
      controller.handlePointerTarget(null);
      return;
    }

    let frame = 0;
    let pendingTarget: EventTarget | null = null;

    const flush = () => {
      frame = 0;
      controller.handlePointerTarget(pendingTarget);
    };

    const onPointerMove = (event: PointerEvent) => {
      pendingTarget = event.target;
      if (frame !== 0) {
        return;
      }
      frame = window.requestAnimationFrame(flush);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [enabled, rootRef]);
}
