export const WORKBENCH_OVERLAYS_CLASS = 'ide-workbench-overlays';

export interface ModalContainerBounds {
  height: number;
  width: number;
}

export function resolveModalContainer(element: HTMLElement | null): HTMLElement | null {
  if (element === null) {
    return null;
  }

  return element.closest(`.${WORKBENCH_OVERLAYS_CLASS}`);
}

export function readWindowViewportBounds(): ModalContainerBounds {
  if (typeof window === 'undefined') {
    return { height: 0, width: 0 };
  }

  return {
    height: window.innerHeight,
    width: window.innerWidth,
  };
}

export function readModalContainerBounds(container: HTMLElement | null): ModalContainerBounds {
  if (container !== null) {
    return {
      height: container.clientHeight,
      width: container.clientWidth,
    };
  }

  return readWindowViewportBounds();
}
