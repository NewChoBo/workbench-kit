import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { clampFixedOverlayPosition } from './clampFixedOverlayPosition';
import { readOverlayBounds } from './overlayBounds';
import { useWorkbenchPresentationScope } from './presentationScope';

export function useClampedFixedOverlayPosition(
  containerRef: RefObject<HTMLElement | null>,
  anchor: { x: number; y: number },
  repositionKey: unknown,
): { x: number; y: number; boundsStyle?: CSSProperties } {
  const [position, setPosition] = useState<{ x: number; y: number; boundsStyle?: CSSProperties }>(
    anchor,
  );
  const scope = useWorkbenchPresentationScope();
  const naturalMaxWidth = useRef<number | null>(null);

  useEffect(() => {
    setPosition(anchor);
  }, [anchor.x, anchor.y]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof window === 'undefined' || scope?.active === false) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (!scope) {
        naturalMaxWidth.current = null;
        setPosition(clampFixedOverlayPosition(anchor.x, anchor.y, rect));
        return;
      }
      const bounds = readOverlayBounds(element, scope.bounds.current);
      const maxHeight = Math.max(0, bounds.height - 8);
      const availableWidth = Math.max(0, bounds.width - 8);
      if (naturalMaxWidth.current === null) {
        const existingMax = Number.parseFloat(
          element.ownerDocument.defaultView!.getComputedStyle(element).maxWidth,
        );
        naturalMaxWidth.current = Number.isFinite(existingMax) ? existingMax : Infinity;
      }
      const maxWidth = Math.min(naturalMaxWidth.current, availableWidth);
      setPosition({
        x: Math.max(
          bounds.left + 4,
          Math.min(anchor.x, bounds.right - Math.min(rect.width, maxWidth) - 4),
        ),
        y: Math.max(
          bounds.top + 4,
          Math.min(anchor.y, bounds.bottom - Math.min(rect.height, maxHeight) - 4),
        ),
        boundsStyle: {
          maxWidth,
          maxHeight,
          minWidth: Math.min(128, maxWidth),
          overflowY: 'auto',
          boxSizing: 'border-box',
        },
      });
    };
    const frame = window.requestAnimationFrame(measure);
    if (scope) {
      window.addEventListener('resize', measure);
      window.addEventListener('scroll', measure, true);
    }
    return () => {
      window.cancelAnimationFrame(frame);
      if (scope) {
        window.removeEventListener('resize', measure);
        window.removeEventListener('scroll', measure, true);
      }
    };
  }, [anchor.x, anchor.y, containerRef, repositionKey, scope]);

  return position;
}
