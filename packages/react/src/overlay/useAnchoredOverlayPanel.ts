import { readOverlayBounds } from './overlayBounds';
import {
  useWorkbenchPresentationScope,
  isWorkbenchPresentationInactive,
  hasActiveWorkbenchGlobalModal,
} from './presentationScope';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefCallback,
  type RefObject,
} from 'react';

import {
  isSearchableMultiSelectPortalTarget,
  resolvePortalContainer,
} from '../primitives/searchable-multi-select/overlay';
import {
  measureAnchoredOverlayPanelInBounds,
  type MeasureAnchoredOverlayPanelOptions,
} from './measureAnchoredOverlayPanel';

export interface UseAnchoredOverlayPanelOptions {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly triggerRef: RefObject<HTMLElement | null>;
  readonly panelRef?: RefObject<HTMLElement | null>;
  readonly measureOptions?: MeasureAnchoredOverlayPanelOptions;
  /** Extra "inside" predicates (e.g. host markers). */
  readonly isInsideExtra?: (target: EventTarget | null) => boolean;
}

export interface UseAnchoredOverlayPanelResult {
  readonly style: CSSProperties | null;
  readonly portalRoot: HTMLElement;
  readonly panelProps: {
    /** Always a callback ref so it composes with host `panelRef` and panel shells. */
    ref: RefCallback<HTMLElement>;
    tabIndex: number;
    style: CSSProperties | null;
  };
}

function assignRef<T>(
  ref: RefObject<T | null> | RefCallback<T> | null | undefined,
  value: T | null,
): void {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (ref) {
    (ref as { current: T | null }).current = value;
  }
}

function isInsideCatalogFilterOverlay(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest('[data-ui-catalog-filter-overlay]') !== null;
}

/**
 * Host-neutral anchored overlay panel helper: trigger-relative placement,
 * viewport clamping, dismiss lifecycle, remeasure on resize/scroll, and portal root.
 *
 * Pair with `CatalogFilterOverlay` (or a similar panel shell). Unlike
 * `useFixedOverlayDismiss`, scroll and resize remeasure instead of closing.
 */
export function useAnchoredOverlayPanel({
  open,
  onOpenChange,
  triggerRef,
  panelRef: externalPanelRef,
  measureOptions,
  isInsideExtra,
}: UseAnchoredOverlayPanelOptions): UseAnchoredOverlayPanelResult {
  const presentationScope = useWorkbenchPresentationScope();
  const presentationActive = presentationScope?.active !== false;
  const presentationOwned = presentationScope !== undefined;
  const internalPanelRef = useRef<HTMLElement | null>(null);
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const didFocusOnOpenRef = useRef(false);

  const setPanelNode = useCallback<RefCallback<HTMLElement>>(
    (node) => {
      internalPanelRef.current = node;
      assignRef(externalPanelRef, node);
    },
    [externalPanelRef],
  );

  const remeasure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!presentationActive || isWorkbenchPresentationInactive(trigger)) return;
    if (!open || !trigger) {
      setStyle(null);
      return;
    }

    const rect = measureAnchoredOverlayPanelInBounds(
      trigger,
      measureOptions ?? {},
      readOverlayBounds(trigger, presentationScope?.bounds.current),
    );
    setStyle({
      position: 'fixed',
      top: rect.top,
      left: rect.left,
      width: rect.width,
      maxHeight: rect.maxHeight,
    });
  }, [measureOptions, open, presentationActive, presentationScope, triggerRef]);

  useLayoutEffect(() => {
    remeasure();
  }, [remeasure]);

  useEffect(() => {
    if (!open) {
      didFocusOnOpenRef.current = false;
      return;
    }

    const handleResize = () => {
      remeasure();
    };
    const handleScroll = () => {
      remeasure();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, presentationActive, remeasure]);

  useEffect(() => {
    if (!open || !presentationActive) {
      return;
    }

    const isInside = (target: EventTarget | null): boolean => {
      const trigger = triggerRef.current;
      const panel = internalPanelRef.current;
      if (trigger && target instanceof Node && trigger.contains(target)) {
        return true;
      }
      if (panel && target instanceof Node && panel.contains(target)) {
        return true;
      }
      if (isInsideCatalogFilterOverlay(target)) {
        return true;
      }
      if (isSearchableMultiSelectPortalTarget(target)) {
        return true;
      }
      if (isInsideExtra?.(target)) {
        return true;
      }
      return false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        isWorkbenchPresentationInactive(triggerRef.current) ||
        (presentationOwned && hasActiveWorkbenchGlobalModal(document))
      )
        return;
      if (event.key !== 'Escape') {
        return;
      }
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      onOpenChange(false);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        isWorkbenchPresentationInactive(triggerRef.current) ||
        (presentationOwned && hasActiveWorkbenchGlobalModal(document))
      )
        return;
      if (event.defaultPrevented) {
        return;
      }
      if (isInside(event.target)) {
        return;
      }
      onOpenChange(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isInsideExtra, onOpenChange, open, presentationActive, presentationOwned, triggerRef]);

  useEffect(() => {
    if (!open || !presentationActive) {
      return;
    }
    if (didFocusOnOpenRef.current) {
      return;
    }

    const panel = internalPanelRef.current;
    if (!panel) {
      return;
    }

    const active = document.activeElement;
    if (active instanceof Node && panel.contains(active)) {
      didFocusOnOpenRef.current = true;
      return;
    }

    if (presentationScope && hasActiveWorkbenchGlobalModal(panel.ownerDocument)) return;
    panel.focus();
    didFocusOnOpenRef.current = true;
  }, [open, presentationActive, presentationScope, style]);

  const portalRoot = presentationScope?.container ?? resolvePortalContainer(triggerRef.current);

  return {
    style,
    portalRoot,
    panelProps: {
      ref: setPanelNode,
      tabIndex: -1,
      style,
    },
  };
}
