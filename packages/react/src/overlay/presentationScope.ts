import { createContext, useContext, type RefObject } from 'react';

/** Internal adapter ownership. No scope means the legacy standalone behavior. */
export interface WorkbenchPresentationScope {
  readonly active: boolean;
  readonly bounds: RefObject<HTMLElement | null>;
  readonly container: HTMLElement | null;
}

export const WorkbenchPresentationScopeContext = createContext<
  WorkbenchPresentationScope | undefined
>(undefined);
export const WorkbenchFrameFocusContext = createContext<
  ((previousFocus: HTMLElement | null) => void) | undefined
>(undefined);

export function useWorkbenchPresentationScope(): WorkbenchPresentationScope | undefined {
  return useContext(WorkbenchPresentationScopeContext);
}

/** Only owned presentation roots and their descendants participate in suspension. */
export function isWorkbenchPresentationInactive(element: HTMLElement | null): boolean {
  const scope = element?.closest<HTMLElement>(
    '[data-workbench-presentation], [data-workbench-presentation-pane]',
  );
  if (!scope || !element) return false;
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    if (
      (scope.contains(current) ||
        current.matches('[data-workbench-presentation], [data-workbench-presentation-pane]')) &&
      (current.hidden || current.hasAttribute('inert'))
    )
      return true;
  }
  return false;
}

export function resolveWorkbenchPresentationPortal(
  element: HTMLElement | null,
): HTMLElement | null {
  const scope = element?.closest<HTMLElement>(
    '[data-workbench-presentation], [data-workbench-presentation-pane]',
  );
  return (
    scope?.querySelector<HTMLElement>(':scope > [data-workbench-presentation-overlays]') ?? null
  );
}

/** Global dialogs outside local scopes take precedence over suspended/local focus work. */
export function hasActiveWorkbenchGlobalModal(document: Document): boolean {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[aria-modal="true"], dialog[open]'),
  ).some((modal) => {
    const owner = modal.closest(
      '[data-workbench-presentation], [data-workbench-presentation-pane], [data-workbench-global-overlays]',
    );
    if (owner && !owner.hasAttribute('data-workbench-global-overlays')) return false;
    if (modal.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    for (let current: HTMLElement | null = modal; current; current = current.parentElement) {
      const style = document.defaultView?.getComputedStyle(current);
      if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    }
    return true;
  });
}
