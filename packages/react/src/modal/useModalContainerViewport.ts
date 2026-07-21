import { useEffect, useState, type RefObject } from 'react';

import {
  readModalContainerBounds,
  readWindowViewportBounds,
  resolveModalContainer,
  type ModalContainerBounds,
} from './modalContainer';

export function useModalContainerViewport(
  frameRef: RefObject<HTMLDivElement | HTMLFormElement | null>,
  frameVersion: number,
): ModalContainerBounds {
  const [viewport, setViewport] = useState<ModalContainerBounds>(() => readWindowViewportBounds());

  useEffect(() => {
    const frame = frameRef.current;
    const container = resolveModalContainer(frame);

    const updateViewport = (): void => {
      setViewport(readModalContainerBounds(container));
    };

    updateViewport();

    if (container !== null) {
      const observer = new ResizeObserver(updateViewport);
      observer.observe(container);
      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener('resize', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
    };
  }, [frameRef, frameVersion]);

  return viewport;
}
