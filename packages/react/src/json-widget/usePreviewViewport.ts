import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

export interface PreviewViewportState {
  canZoomIn: boolean;
  canZoomOut: boolean;
  effectiveZoom: number;
  fitScale: number;
  isPanning: boolean;
  isSpacePressed: boolean;
  pan: { x: number; y: number };
  resetView: () => void;
  scaleLabel: string;
  setCanvasElement: (element: HTMLDivElement | null) => void;
  stageStyle: { transform: string };
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
}

export interface UsePreviewViewportOptions {
  canvasHeight: number;
  canvasWidth: number;
  panToolActive?: boolean | undefined;
  titleBarHeight?: number;
}

export function usePreviewViewport({
  canvasHeight,
  canvasWidth,
  panToolActive = false,
  titleBarHeight = 32,
}: UsePreviewViewportOptions): PreviewViewportState {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [canvasEl, setCanvasElement] = useState<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const spacePressedRef = useRef(false);
  const panToolActiveRef = useRef(panToolActive);

  useEffect(() => {
    panToolActiveRef.current = panToolActive;
  }, [panToolActive]);

  const frameHeight = canvasHeight + titleBarHeight;
  const fitScale =
    viewportSize.width > 0 && viewportSize.height > 0
      ? Math.min(
          1,
          Math.max(MIN_ZOOM, (viewportSize.width - 48) / canvasWidth),
          Math.max(MIN_ZOOM, (viewportSize.height - 88) / frameHeight),
        )
      : 1;
  const effectiveZoom = zoom * fitScale;

  const startPanRef = useRef<
    ((clientX: number, clientY: number, pointerId: number) => void) | undefined
  >(undefined);

  useLayoutEffect(() => {
    startPanRef.current = (clientX, clientY, pointerId) => {
      setIsPanning(true);
      let lastX = clientX;
      let lastY = clientY;

      const onMove = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        setPan((current) => ({
          x: current.x + event.clientX - lastX,
          y: current.y + event.clientY - lastY,
        }));
        lastX = event.clientX;
        lastY = event.clientY;
      };

      const onUp = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        setIsPanning(false);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };
  });

  const wheelHandlerRef = useRef<((event: WheelEvent) => void) | undefined>(undefined);

  useLayoutEffect(() => {
    wheelHandlerRef.current = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
        setZoom((current) =>
          Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current - event.deltaY * 0.003)),
        );
      } else {
        setPan((current) => ({
          x: current.x - event.deltaX * 0.8,
          y: current.y - event.deltaY * 0.8,
        }));
      }
    };
  });

  useEffect(() => {
    if (!canvasEl) return;

    const updateViewportSize = () => {
      const rect = canvasEl.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };

    updateViewportSize();
    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(canvasEl);

    const wheelHandler = (event: WheelEvent) => wheelHandlerRef.current?.(event);
    canvasEl.addEventListener('wheel', wheelHandler, { passive: false });

    const middlePanHandler = (event: PointerEvent) => {
      const target = event.target;
      const spacePan = spacePressedRef.current;
      const handPan = panToolActiveRef.current;
      const isMiddleButton = event.button === 1;
      const isPreviewSurfaceDrag =
        event.button === 0 &&
        !spacePan &&
        !handPan &&
        target instanceof HTMLElement &&
        !target.closest(
          [
            '[data-playground-path]',
            '[role="separator"]',
            'button',
            'input',
            'select',
            'textarea',
          ].join(','),
        );

      if (!spacePan && !handPan && !isMiddleButton && !isPreviewSurfaceDrag) return;
      if ((spacePan || handPan) && event.button !== 0) return;
      event.preventDefault();
      startPanRef.current?.(event.clientX, event.clientY, event.pointerId);
    };

    canvasEl.addEventListener('pointerdown', middlePanHandler, { capture: true });

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest(
          'input, textarea, select, [contenteditable="true"], .monaco-editor, [role="textbox"]',
        ),
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || isEditableTarget(event.target)) return;
      event.preventDefault();
      spacePressedRef.current = true;
      setIsSpacePressed(true);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      spacePressedRef.current = false;
      setIsSpacePressed(false);
    };

    const onWindowBlur = () => {
      spacePressedRef.current = false;
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      resizeObserver.disconnect();
      canvasEl.removeEventListener('wheel', wheelHandler);
      canvasEl.removeEventListener('pointerdown', middlePanHandler, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [canvasEl]);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const zoomIn = () => setZoom((current) => Math.min(MAX_ZOOM, current + 0.1));
  const zoomOut = () => setZoom((current) => Math.max(MIN_ZOOM, current - 0.1));
  const zoomToFit = resetView;

  return {
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > MIN_ZOOM,
    effectiveZoom,
    fitScale,
    isPanning,
    isSpacePressed,
    pan,
    resetView,
    scaleLabel: `${Math.round(effectiveZoom * 100)}%`,
    setCanvasElement,
    stageStyle: {
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveZoom})`,
    },
    zoomIn,
    zoomOut,
    zoomToFit,
  };
}
