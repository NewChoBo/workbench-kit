import { useEffect, useState, type RefObject } from 'react';
import { clampFixedOverlayPosition } from './clampFixedOverlayPosition';

export function useClampedFixedOverlayPosition(
  containerRef: RefObject<HTMLElement | null>,
  anchor: { x: number; y: number },
  repositionKey: unknown,
): { x: number; y: number } {
  const [position, setPosition] = useState(anchor);

  useEffect(() => {
    setPosition(anchor);
  }, [anchor.x, anchor.y]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof window === 'undefined') return;

    const frame = window.requestAnimationFrame(() => {
      setPosition(clampFixedOverlayPosition(anchor.x, anchor.y, element.getBoundingClientRect()));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [anchor.x, anchor.y, containerRef, repositionKey]);

  return position;
}
