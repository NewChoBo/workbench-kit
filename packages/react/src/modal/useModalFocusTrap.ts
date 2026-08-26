import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
    return false;
  }
  if (element.getAttribute('aria-hidden') === 'true') {
    return false;
  }
  // Explicit tabindex="-1" removes the node from the tab order.
  // Do not use element.tabIndex >= 0: jsdom reports -1 for native buttons.
  if (element.getAttribute('tabindex') === '-1') {
    return false;
  }
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function listFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isFocusable,
  );
}

export interface UseModalFocusTrapOptions {
  readonly closeOnEscape?: boolean;
  readonly containerRef: RefObject<HTMLElement | null>;
  /** When false, skip trap/restore (for dialogs that stay mounted while closed). Default true. */
  readonly enabled?: boolean;
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  readonly onClose: () => void;
  readonly restoreFocusOnClose?: boolean;
}

/**
 * Trap Tab focus inside a mounted modal dialog and restore focus on unmount.
 * Escape dismisses when `closeOnEscape` is true (default).
 */
export function useModalFocusTrap({
  closeOnEscape = true,
  containerRef,
  enabled = true,
  initialFocusRef,
  onClose,
  restoreFocusOnClose = true,
}: UseModalFocusTrapOptions): void {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitial = () => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const preferred = initialFocusRef?.current;
      if (preferred && container.contains(preferred)) {
        preferred.focus();
        return;
      }

      const focusables = listFocusable(container);
      if (focusables[0]) {
        focusables[0].focus();
        return;
      }

      if (!container.hasAttribute('tabindex')) {
        container.tabIndex = -1;
      }
      container.focus();
    };

    const frame = window.requestAnimationFrame(focusInitial);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const focusables = listFocusable(container);
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown, true);
      if (restoreFocusOnClose && previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [closeOnEscape, containerRef, enabled, initialFocusRef, restoreFocusOnClose]);
}
