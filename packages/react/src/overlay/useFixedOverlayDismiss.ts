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
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (onEscape?.()) return;

      event.preventDefault();
      onClose();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (ignoreOutsidePointer) return;
      if (containerRef.current?.contains(event.target as Node)) return;
      // Portaled SMS listbox is not a DOM child of the overlay root.
      if (isSearchableMultiSelectPortalTarget(event.target)) return;
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [containerRef, ignoreOutsidePointer, onClose, onEscape]);
}
