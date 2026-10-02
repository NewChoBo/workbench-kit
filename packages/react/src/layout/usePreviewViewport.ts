import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefCallback,
} from 'react';

export interface PreviewViewportPoint {
  readonly x: number;
  readonly y: number;
}

export interface PreviewViewportSize {
  readonly height: number;
  readonly width: number;
}

export interface UsePreviewViewportOptions {
  readonly contentHeight?: number | undefined;
  readonly contentWidth?: number | undefined;
  readonly maxZoom?: number | undefined;
  readonly minZoom?: number | undefined;
  /**
   * When false, only middle-mouse starts a pan gesture (safer for interactive
   * authoring canvases with drag/resize chrome). Default true.
   */
  readonly enablePrimaryPointerPan?: boolean | undefined;
  /**
   * When true, primary-pointer pan starts even over buttons/inputs.
   * Use for read-only preview surfaces whose content is mostly interactive chrome.
   */
  readonly ignoreInteractiveTargets?: boolean | undefined;
  readonly viewportPadding?: number | undefined;
  readonly zoomWheelScale?: number | undefined;
}

export interface UsePreviewViewportResult {
  readonly effectiveZoom: number;
  readonly isPanning: boolean;
  /** False until the host has a positive laid-out size (avoids fitScale=1 close-up flash). */
  readonly isViewportReady: boolean;
  /** Return to the current fit scale and center the content frame. */
  readonly resetView: () => void;
  /**
   * Set one logical content unit per CSS pixel, independent of fit and wheel limits.
   * Center a finite content-space point, or the content frame when omitted.
   * Point centering requires finite positive content dimensions; invalid input
   * throws RangeError before changing the view. Scale and pan persist on resize.
   */
  readonly zoomToActualSize: (contentPoint?: PreviewViewportPoint) => void;
  readonly setViewportElement: RefCallback<HTMLDivElement>;
  readonly stageStyle: CSSProperties;
  /** Equivalent fit multiplier (effectiveZoom / fitScale); can exceed wheel limits in absolute mode. */
  readonly userZoom: number;
  readonly viewportSize: PreviewViewportSize;
}

export function clampPreviewViewportZoom(zoom: number, minZoom: number, maxZoom: number): number {
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}

export function computePreviewViewportFitScale(
  viewportSize: PreviewViewportSize,
  contentSize: PreviewViewportSize,
  padding = 48,
  minimumScale = 0.05,
): number {
  if (!Number.isFinite(minimumScale) || minimumScale < 0 || minimumScale > 1) {
    throw new RangeError('minimumScale must be finite and between 0 and 1.');
  }
  if (
    viewportSize.width <= 0 ||
    viewportSize.height <= 0 ||
    contentSize.width <= 0 ||
    contentSize.height <= 0
  ) {
    return 1;
  }

  const availableWidth = Math.max(0, viewportSize.width - padding);
  const availableHeight = Math.max(0, viewportSize.height - padding);

  return Math.min(
    1,
    Math.max(minimumScale, availableWidth / contentSize.width),
    Math.max(minimumScale, availableHeight / contentSize.height),
  );
}

/**
 * Keeps the content point under the cursor stable when zoom changes.
 * Assumes stage transform `translate(pan) scale(zoom)` with `transform-origin: center`.
 */
export function computeZoomPanTowardPoint(input: {
  readonly currentPan: PreviewViewportPoint;
  readonly currentZoom: number;
  readonly nextZoom: number;
  readonly pointFromCenter: PreviewViewportPoint;
}): PreviewViewportPoint {
  const { currentPan, currentZoom, nextZoom, pointFromCenter } = input;
  if (currentZoom <= 0 || nextZoom <= 0 || currentZoom === nextZoom) {
    return currentPan;
  }

  const ratio = nextZoom / currentZoom;
  return {
    x: pointFromCenter.x - ratio * (pointFromCenter.x - currentPan.x),
    y: pointFromCenter.y - ratio * (pointFromCenter.y - currentPan.y),
  };
}

const PREVIEW_VIEWPORT_INTERACTIVE_SELECTOR = [
  'button',
  'input',
  'select',
  'textarea',
  'a',
  'label',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="option"]',
  '[contenteditable="true"]',
  '[data-library-filter-overlay="true"]',
  '[data-ui-catalog-filter-overlay="true"]',
  '[data-ui-searchable-multi-select-listbox="true"]',
  '.ui-select__listbox',
  '.library-filter-popover',
].join(', ');

export function shouldStartPreviewViewportPan(
  event: Pick<PointerEvent, 'button' | 'pointerType' | 'target'>,
  options: {
    readonly enablePrimaryPointerPan?: boolean | undefined;
    readonly ignoreInteractiveTargets?: boolean | undefined;
  } = {},
): boolean {
  if (event.button === 1) {
    return true;
  }

  if (options.enablePrimaryPointerPan === false) {
    return false;
  }

  const isTouchLikePointer = event.pointerType === 'touch' || event.pointerType === 'pen';
  const isPrimaryPointer = event.button === 0 || (isTouchLikePointer && event.button === -1);
  if (!isPrimaryPointer) {
    return false;
  }

  if (options.ignoreInteractiveTargets) {
    const target =
      typeof Element !== 'undefined' && event.target instanceof Element ? event.target : null;
    // Keep viewport chrome controls clickable (Reset, etc.).
    if (target?.closest('.ui-workbench-preview-canvas__reset')) {
      return false;
    }
    return true;
  }

  const target =
    typeof Element !== 'undefined' && event.target instanceof Element ? event.target : null;

  return target ? !target.closest(PREVIEW_VIEWPORT_INTERACTIVE_SELECTOR) : true;
}

export function usePreviewViewport({
  contentHeight,
  contentWidth,
  enablePrimaryPointerPan = true,
  ignoreInteractiveTargets = false,
  maxZoom = 6,
  minZoom = 0.2,
  viewportPadding = 48,
  zoomWheelScale = 0.003,
}: UsePreviewViewportOptions = {}): UsePreviewViewportResult {
  const [zoom, setZoom] = useState<{ readonly mode: 'fit' | 'absolute'; readonly value: number }>({
    mode: 'fit',
    value: 1,
  });
  const [pan, setPan] = useState<PreviewViewportPoint>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [viewportElement, setViewportElementState] = useState<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<PreviewViewportSize>({ width: 0, height: 0 });

  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const fitScaleRef = useRef(1);

  const fitScale = useMemo(() => {
    if (
      contentWidth === undefined ||
      contentHeight === undefined ||
      viewportSize.width <= 0 ||
      viewportSize.height <= 0
    ) {
      // Keep the last real fit while unmeasured — returning 1 here paints a close-up.
      return fitScaleRef.current > 0 ? fitScaleRef.current : 1;
    }

    return computePreviewViewportFitScale(
      viewportSize,
      { width: contentWidth, height: contentHeight },
      viewportPadding,
    );
  }, [contentHeight, contentWidth, viewportPadding, viewportSize]);

  const effectiveZoom = zoom.mode === 'absolute' ? zoom.value : zoom.value * fitScale;
  const userZoom = zoom.mode === 'absolute' ? effectiveZoom / fitScale : zoom.value;

  useLayoutEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useLayoutEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useLayoutEffect(() => {
    fitScaleRef.current = fitScale;
  }, [fitScale]);

  const resetView = useCallback(() => {
    zoomRef.current = { mode: 'fit', value: 1 };
    panRef.current = { x: 0, y: 0 };
    setZoom(zoomRef.current);
    setPan(panRef.current);
  }, []);

  const zoomToActualSize = useCallback(
    (contentPoint?: PreviewViewportPoint) => {
      let nextPan: PreviewViewportPoint = { x: 0, y: 0 };
      if (contentPoint !== undefined) {
        if (!Number.isFinite(contentPoint?.x) || !Number.isFinite(contentPoint?.y)) {
          throw new RangeError('contentPoint coordinates must be finite.');
        }
        if (
          contentWidth === undefined ||
          contentHeight === undefined ||
          !Number.isFinite(contentWidth) ||
          !Number.isFinite(contentHeight) ||
          contentWidth <= 0 ||
          contentHeight <= 0
        ) {
          throw new RangeError('Point centering requires finite positive content dimensions.');
        }
        nextPan = { x: contentWidth / 2 - contentPoint.x, y: contentHeight / 2 - contentPoint.y };
        if (!Number.isFinite(nextPan.x) || !Number.isFinite(nextPan.y)) {
          throw new RangeError('Point centering must produce finite pan coordinates.');
        }
      }
      zoomRef.current = { mode: 'absolute', value: 1 };
      panRef.current = nextPan;
      setZoom(zoomRef.current);
      setPan(nextPan);
    },
    [contentHeight, contentWidth],
  );

  const setViewportElement = useCallback<RefCallback<HTMLDivElement>>((node) => {
    setViewportElementState(node);
  }, []);

  const isViewportReady = viewportSize.width > 0 && viewportSize.height > 0;

  // Measure before paint so the first frame already uses a real fitScale.
  useLayoutEffect(() => {
    if (!viewportElement) {
      return;
    }

    const updateViewportSize = () => {
      const rect = viewportElement.getBoundingClientRect();
      // Keep the last measured size while the host is display:none (keep-alive
      // editor tabs). Zero sizes collapse fitScale to 1 and briefly flash the
      // stage when the pane becomes visible again.
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      setViewportSize((current) =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height },
      );
    };

    updateViewportSize();

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateViewportSize);
    resizeObserver?.observe(viewportElement);

    return () => {
      resizeObserver?.disconnect();
    };
  }, [viewportElement]);

  useEffect(() => {
    if (!viewportElement) {
      return;
    }

    let activePointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const stopPan = () => {
      activePointerId = null;
      setIsPanning(false);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (activePointerId === null || event.pointerId !== activePointerId) {
        return;
      }

      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      setPan((current) => ({
        x: current.x + deltaX,
        y: current.y + deltaY,
      }));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (activePointerId === null || event.pointerId !== activePointerId) {
        return;
      }

      if (viewportElement.hasPointerCapture?.(event.pointerId)) {
        viewportElement.releasePointerCapture(event.pointerId);
      }
      stopPan();
    };

    const startPan = (event: PointerEvent) => {
      if (
        !shouldStartPreviewViewportPan(event, {
          enablePrimaryPointerPan,
          ignoreInteractiveTargets,
        })
      ) {
        return false;
      }

      // Middle-click: block browser auto-scroll / open-link defaults.
      event.preventDefault();
      event.stopPropagation();
      activePointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      setIsPanning(true);

      try {
        viewportElement.setPointerCapture(event.pointerId);
      } catch {
        // Some environments reject capture; window listeners still handle moves.
      }

      return true;
    };

    const onPointerDown = (event: PointerEvent) => {
      startPan(event);
    };

    // Chrome starts middle-button autoscroll from mousedown; prevent it explicitly.
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 1) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    const onAuxClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const onWheel = (event: WheelEvent) => {
      // Always claim the wheel so host ScrollAreas do not steal pan/zoom.
      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        const currentZoom = zoomRef.current;
        const isAbsolute = currentZoom.mode === 'absolute';
        const nextZoom = clampPreviewViewportZoom(
          currentZoom.value - event.deltaY * zoomWheelScale,
          isAbsolute ? Math.min(minZoom, 1) : minZoom,
          isAbsolute ? Math.max(maxZoom, 1) : maxZoom,
        );
        if (nextZoom === currentZoom.value) {
          return;
        }

        const rect = viewportElement.getBoundingClientRect();
        const currentEffectiveZoom = isAbsolute
          ? currentZoom.value
          : currentZoom.value * fitScaleRef.current;
        const nextEffectiveZoom = isAbsolute ? nextZoom : nextZoom * fitScaleRef.current;
        const pointFromCenter = {
          x: event.clientX - rect.left - rect.width / 2,
          y: event.clientY - rect.top - rect.height / 2,
        };

        const nextPan = computeZoomPanTowardPoint({
          currentPan: panRef.current,
          currentZoom: currentEffectiveZoom,
          nextZoom: nextEffectiveZoom,
          pointFromCenter,
        });
        panRef.current = nextPan;
        zoomRef.current = { mode: currentZoom.mode, value: nextZoom };
        setPan(nextPan);
        setZoom(zoomRef.current);
        return;
      }

      setPan((current) => ({
        x: current.x - event.deltaX * 0.8,
        y: current.y - event.deltaY * 0.8,
      }));
    };

    viewportElement.addEventListener('pointerdown', onPointerDown, { capture: true });
    viewportElement.addEventListener('mousedown', onMouseDown, { capture: true });
    viewportElement.addEventListener('auxclick', onAuxClick, { capture: true });
    viewportElement.addEventListener('wheel', onWheel, { passive: false, capture: true });
    // Window listeners keep pan alive if the pointer leaves the canvas.
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      viewportElement.removeEventListener('pointerdown', onPointerDown, true);
      viewportElement.removeEventListener('mousedown', onMouseDown, true);
      viewportElement.removeEventListener('auxclick', onAuxClick, true);
      viewportElement.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [
    enablePrimaryPointerPan,
    ignoreInteractiveTargets,
    maxZoom,
    minZoom,
    viewportElement,
    zoomWheelScale,
  ]);

  const stageStyle = useMemo(
    (): CSSProperties => ({
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveZoom})`,
      // Hide until laid out so fitScale=1 never paints as a close-up flash.
      visibility: isViewportReady ? 'visible' : 'hidden',
    }),
    [effectiveZoom, isViewportReady, pan.x, pan.y],
  );

  return {
    effectiveZoom,
    isPanning,
    isViewportReady,
    resetView,
    zoomToActualSize,
    setViewportElement,
    stageStyle,
    userZoom,
    viewportSize,
  };
}
