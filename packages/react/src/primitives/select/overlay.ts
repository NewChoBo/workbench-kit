import type { CSSProperties } from 'react';
import type { ListboxPlacement, OverlayPosition } from './types';

const LISTBOX_MAX_HEIGHT = 240;
const LISTBOX_OPTION_HEIGHT = 28;
const VIEWPORT_PADDING = 8;

export function isTriggerVisible(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
  if (rect.right <= 0 || rect.left >= window.innerWidth) return false;

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
  if (rect.width <= 0 || rect.height <= 0) return null;

  const idealHeight = Math.min(LISTBOX_MAX_HEIGHT, optionCount * LISTBOX_OPTION_HEIGHT + 8);
  const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - VIEWPORT_PADDING);
  const spaceAbove = Math.max(0, rect.top - VIEWPORT_PADDING);
  const placement: ListboxPlacement =
    spaceBelow >= idealHeight || spaceBelow >= spaceAbove ? 'bottom' : 'top';
  const available = placement === 'bottom' ? spaceBelow : spaceAbove;
  const minHeight = LISTBOX_OPTION_HEIGHT + 8;
  const maxHeight = Math.min(LISTBOX_MAX_HEIGHT, idealHeight, Math.max(minHeight, available));

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
    return { ...base, top: position.triggerBottom };
  }

  return {
    ...base,
    top: position.triggerTop,
    transform: 'translateY(-100%)',
  };
}
