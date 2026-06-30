import { startTransition, useEffect, useRef, useState } from 'react';

export interface UseDeferredWorkbenchMountOptions {
  readonly delayMs?: number | undefined;
  readonly disabled?: boolean | undefined;
  readonly initialReady?: boolean | undefined;
}

export function useDeferredWorkbenchMount({
  delayMs = 50,
  disabled = false,
  initialReady = false,
}: UseDeferredWorkbenchMountOptions = {}): boolean {
  const [isReady, setIsReady] = useState(() => disabled || initialReady);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    if (disabled) {
      loadGenerationRef.current += 1;
      setIsReady(true);
      return undefined;
    }

    if (isReady) {
      return undefined;
    }

    const loadGeneration = ++loadGenerationRef.current;
    let cancelFrame: (() => void) | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const deferReady = () => {
      if (loadGenerationRef.current !== loadGeneration) {
        return;
      }

      timeoutHandle = setTimeout(() => {
        if (loadGenerationRef.current !== loadGeneration) {
          return;
        }

        startTransition(() => {
          if (loadGenerationRef.current === loadGeneration) {
            setIsReady(true);
          }
        });
      }, Math.max(0, delayMs));
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const animationFrame = window.requestAnimationFrame(deferReady);
      cancelFrame = () => window.cancelAnimationFrame(animationFrame);
    } else {
      const frameTimer = setTimeout(deferReady, 0);
      cancelFrame = () => clearTimeout(frameTimer);
    }

    return () => {
      loadGenerationRef.current += 1;
      cancelFrame?.();
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    };
  }, [delayMs, disabled, isReady]);

  return isReady;
}
