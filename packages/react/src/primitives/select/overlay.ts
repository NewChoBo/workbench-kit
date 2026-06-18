import type { CSSProperties } from 'react';
import type { ListboxPlacement, OverlayPosition } from './types';

const LISTBOX_MAX_HEIGHT = 240;
const LISTBOX_OPTION_HEIGHT = 28;
const LISTBOX_PADDING = 8;
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

  const idealHeight = Math.min(
    LISTBOX_MAX_HEIGHT,
    optionCount * LISTBOX_OPTION_HEIGHT + LISTBOX_PADDING,
  );
  const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - VIEWPORT_PADDING);
  const spaceAbove = Math.max(0, rect.top - VIEWPORT_PADDING);
  const placement: ListboxPlacement =
    spaceBelow >= idealHeight
      ? 'bottom'
      : spaceAbove >= idealHeight
        ? 'top'
        : spaceBelow >= spaceAbove
          ? 'bottom'
          : 'top';
  const available = placement === 'bottom' ? spaceBelow : spaceAbove;
  const maxHeight = resolveListboxMaxHeight(idealHeight, available);

  return {
    placement,
    left: rect.left,
    width: rect.width,
    maxHeight,
    triggerTop: rect.top,
    triggerBottom: rect.bottom,
  };
}

function resolveListboxMaxHeight(idealHeight: number, available: number): number {
  if (idealHeight < LISTBOX_MAX_HEIGHT) {
    return idealHeight;
  }

  const minHeight = LISTBOX_OPTION_HEIGHT + LISTBOX_PADDING;
  return Math.min(LISTBOX_MAX_HEIGHT, Math.max(minHeight, available));
}

export function overlayListboxStyle(position: OverlayPosition): CSSProperties {
  const isCompact = position.maxHeight < LISTBOX_MAX_HEIGHT;
  const base: CSSProperties = {
    left: position.left,
    width: position.width,
    maxHeight: position.maxHeight,
    overflowY: isCompact ? 'hidden' : 'auto',
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
