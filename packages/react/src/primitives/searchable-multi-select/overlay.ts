import type { CSSProperties } from 'react';

export type ListboxPlacement = 'bottom' | 'top';

export interface OverlayPosition {
  left: number;
  maxHeight: number;
  placement: ListboxPlacement;
  triggerBottom: number;
  triggerTop: number;
  width: number;
}

/** Marker on the portaled listbox so host outside-click handlers can treat it as inside. */
export const SEARCHABLE_MULTI_SELECT_LISTBOX_ATTR = 'data-ui-searchable-multi-select-listbox';

/**
 * True when `target` is inside a portaled SearchableMultiSelect listbox.
 * Use from overlay/popover dismiss handlers — the listbox is not a DOM descendant
 * of the trigger or panel root.
 */
export function isSearchableMultiSelectPortalTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest(`[${SEARCHABLE_MULTI_SELECT_LISTBOX_ATTR}]`) !== null;
}

const LISTBOX_MAX_HEIGHT = 176; // 11rem
const LISTBOX_OPTION_HEIGHT = 26;
const LISTBOX_PADDING = 8;
const VIEWPORT_PADDING = 8;
const GAP = 2;

/**
 * Prefer a themed host so token/scrollbar inheritance stays coherent.
 * Fall back to workbench overlays, then document.body (out-of-theme portals
 * still get explicit listbox colors + `.ui-workbench-scrollbar`).
 */
export function resolvePortalContainer(trigger: HTMLElement | null): HTMLElement {
  return (
    trigger?.closest<HTMLElement>(
      '[data-theme-preset], [data-theme], .ui-workbench-host-root, .ide-workbench-overlays',
    ) ?? document.body
  );
}

export function isTriggerVisible(trigger: HTMLElement): boolean {
  const rect = trigger.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
    return false;
  }
  if (rect.right <= 0 || rect.left >= window.innerWidth) {
    return false;
  }

  if (typeof trigger.checkVisibility === 'function') {
    return trigger.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
  }

  return true;
}

export function measureOverlayPosition(
  trigger: HTMLElement,
  optionCount: number,
): OverlayPosition | null {
  const rect = trigger.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const idealHeight = Math.min(
    LISTBOX_MAX_HEIGHT,
    Math.max(
      LISTBOX_OPTION_HEIGHT + LISTBOX_PADDING,
      optionCount * LISTBOX_OPTION_HEIGHT + LISTBOX_PADDING,
    ),
  );
  const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - VIEWPORT_PADDING - GAP);
  const spaceAbove = Math.max(0, rect.top - VIEWPORT_PADDING - GAP);
  const placement: ListboxPlacement =
    spaceBelow >= idealHeight
      ? 'bottom'
      : spaceAbove >= idealHeight
        ? 'top'
        : spaceBelow >= spaceAbove
          ? 'bottom'
          : 'top';
  const available = placement === 'bottom' ? spaceBelow : spaceAbove;
  const maxHeight = Math.min(
    LISTBOX_MAX_HEIGHT,
    Math.max(LISTBOX_OPTION_HEIGHT + LISTBOX_PADDING, available),
  );

  return {
    placement,
    left: rect.left,
    width: rect.width,
    maxHeight,
    triggerTop: rect.top,
    triggerBottom: rect.bottom,
  };
}

export function overlayListboxStyle(position: OverlayPosition): CSSProperties {
  const base: CSSProperties = {
    left: position.left,
    width: position.width,
    maxHeight: position.maxHeight,
  };

  if (position.placement === 'bottom') {
    return { ...base, top: position.triggerBottom + GAP };
  }

  return {
    ...base,
    top: position.triggerTop - GAP,
    transform: 'translateY(-100%)',
  };
}
