import {
  useWorkbenchPresentationScope,
  isWorkbenchPresentationInactive,
  hasActiveWorkbenchGlobalModal,
} from './presentationScope';
import { useEffect, type RefObject } from 'react';

import { isSearchableMultiSelectPortalTarget } from '../primitives/searchable-multi-select/overlay';

export interface FixedOverlayDismissOptions {
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** Return true when Escape was handled by nested UI (skip closing the root overlay). */
  onEscape?: (() => boolean) | undefined;
  /** When true, outside pointer events do not close the root overlay. */
  ignoreOutsidePointer?: boolean | undefined;
}

export function useFixedOverlayDismiss({
  containerRef,
  onClose,
  onEscape,
  ignoreOutsidePointer = false,
}: FixedOverlayDismissOptions): void {
  const presentationScope = useWorkbenchPresentationScope();
  const presentationActive = presentationScope?.active !== false;
  const presentationOwned = presentationScope !== undefined;
  useEffect(() => {
    if (!presentationActive) return;
    const suspended = () =>
      isWorkbenchPresentationInactive(containerRef.current) ||
      (presentationOwned && hasActiveWorkbenchGlobalModal(document));
    const close = () => {
      if (!suspended()) onClose();
    };
    const handleScroll = (event: Event) => {
      // Scoped panels can scroll within their bounded content region. Scrolling
      // that panel does not invalidate its placement or dismiss its actions.
      if (
        presentationOwned &&
        event.target instanceof Node &&
        containerRef.current?.contains(event.target)
      ) {
        return;
      }
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (suspended()) return;
      if (event.key !== 'Escape') return;
      if (onEscape?.()) return;

      event.preventDefault();
      onClose();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (suspended()) return;
      if (ignoreOutsidePointer) return;
      if (containerRef.current?.contains(event.target as Node)) return;
      // Portaled SMS listbox is not a DOM child of the overlay root.
      if (isSearchableMultiSelectPortalTarget(event.target)) return;
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [
    containerRef,
    ignoreOutsidePointer,
    onClose,
    onEscape,
    presentationActive,
    presentationOwned,
  ]);
}
