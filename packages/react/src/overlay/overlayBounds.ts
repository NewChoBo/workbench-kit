export interface OverlayBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
  readonly scoped: boolean;
}

/** Presentation content wins over pane geometry; a standalone opted-in split owns its bounds. */
export function readOverlayBounds(trigger: HTMLElement, owner?: HTMLElement | null): OverlayBounds {
  const region =
    owner ??
    trigger.closest<HTMLElement>('[data-workbench-presentation]') ??
    trigger.closest<HTMLElement>('[data-workbench-split-overlay-scope]');
  if (region) return { ...readRect(region.getBoundingClientRect()), scoped: true };
  const viewport = trigger.ownerDocument.defaultView ?? window;
  return {
    left: 0,
    top: 0,
    right: viewport.innerWidth,
    bottom: viewport.innerHeight,
    width: viewport.innerWidth,
    height: viewport.innerHeight,
    scoped: false,
  };
}

function readRect(rect: DOMRect): Omit<OverlayBounds, 'scoped'> {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}
