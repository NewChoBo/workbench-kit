import { useEffect, useRef, type RefObject } from 'react';

import {
  createPointerPassthroughController,
  resolvePointerHitTarget,
  type PointerPassthroughPort,
} from './pointerPassthroughRegion';

export type PointerHitTargetResolver = (clientX: number, clientY: number) => EventTarget | null;

export interface UsePointerPassthroughRegionOptions {
  readonly enabled: boolean;
  readonly port: PointerPassthroughPort;
  /** Host-provided CSS selectors for interactive hit regions. */
  readonly hitSelectors: readonly string[];
  /** Optional extra control chrome selectors (also treated as hit). */
  readonly controlSelectors?: readonly string[];
  /** Limit hit-testing to a subtree; defaults to the document. */
  readonly rootRef?: RefObject<HTMLElement | null>;
  /** Override painted-element resolution; defaults to `document.elementFromPoint`. */
  readonly resolveHitTarget?: PointerHitTargetResolver;
}

/**
 * Toggles host pointer passthrough from renderer hit-testing.
 * Uses `requestAnimationFrame` coalescing and painted-element hit-testing; no
 * product selectors in kit. Electron can forward move events while ignoring
 * mouse input, in which case `event.target` is not necessarily under the cursor.
 *
 * Host responsibilities:
 * - Provide selector lists
 * - Implement `port.setPointerPassthrough` (usually IPC → ignore-mouse-events)
 * - Pair with platform residency applicator for the main-process half
 */
export function usePointerPassthroughRegion(options: UsePointerPassthroughRegionOptions): void {
  const { enabled, port, hitSelectors, controlSelectors, rootRef, resolveHitTarget } = options;

  const portRef = useRef(port);
  portRef.current = port;
  const hitSelectorsRef = useRef(hitSelectors);
  hitSelectorsRef.current = hitSelectors;
  const controlSelectorsRef = useRef(controlSelectors);
  controlSelectorsRef.current = controlSelectors;
  const resolveHitTargetRef = useRef(resolveHitTarget ?? resolvePointerHitTarget);
  resolveHitTargetRef.current = resolveHitTarget ?? resolvePointerHitTarget;

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
    let pendingX = 0;
    let pendingY = 0;

    const flush = () => {
      frame = 0;
      // Re-assert on every frame. Host state may also change outside this hook;
      // the main-process port should make same-value updates a no-op.
      controller.reset();
      controller.handlePointerTarget(resolveHitTargetRef.current(pendingX, pendingY));
    };

    const onPointerMove = (event: PointerEvent | MouseEvent) => {
      pendingX = event.clientX;
      pendingY = event.clientY;
      if (frame !== 0) {
        return;
      }
      frame = window.requestAnimationFrame(flush);
    };

    const onMouseLeave = () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      controller.reset();
      controller.handlePointerTarget(null);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    // Some Electron builds forward mousemove rather than pointermove while the
    // native window ignores input.
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeave);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onPointerMove);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      // Do not leave the host window stuck in click-through after unmount.
      void portRef.current.setPointerPassthrough(false);
    };
  }, [enabled, rootRef]);
}
