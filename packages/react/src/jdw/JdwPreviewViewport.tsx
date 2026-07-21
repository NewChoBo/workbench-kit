import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import type { WidgetRegistryContract } from '@workbench-kit/contracts';
import {
  DEFAULT_LAYOUT_CONSTRAINTS,
  createWidgetDocument,
  layoutWidget,
  type LayoutConstraints,
} from '@workbench-kit/jdw';

import { WorkbenchPreviewCanvas } from '../layout/WorkbenchCanvas.js';
import { usePreviewViewport } from '../layout/usePreviewViewport.js';
import { cx } from '../utils/cx.js';
import { JdwPreview, type JdwPreviewProps } from './JdwPreview.js';

import './jdw-preview-viewport.css';

const FALLBACK_FRAME_SIZE = { height: 320, width: 400 } as const;

export type JdwPreviewViewportFit = 'container' | 'content';

export interface JdwPreviewViewportProps extends JdwPreviewProps {
  /**
   * `container` (default): outside-in — host size drives layout constraints.
   * `content`: inside-out — document/layoutConstraints size the frame, then scale-to-fit.
   */
  readonly fit?: JdwPreviewViewportFit | undefined;
  readonly help?: ReactNode | undefined;
  readonly showReset?: boolean | undefined;
  readonly showViewportGrid?: boolean | undefined;
  /**
   * When false, only middle-mouse pans (safer when preview nodes are selectable).
   * Default true for read-only preview surfaces.
   */
  readonly enablePrimaryPointerPan?: boolean | undefined;
}

export function resolveJdwPreviewFrameSize(
  json: string,
  layoutConstraints: LayoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
  registry?: WidgetRegistryContract<unknown> | undefined,
): { readonly height: number; readonly width: number } {
  const document = createWidgetDocument(json);
  if (document.root === null) {
    return FALLBACK_FRAME_SIZE;
  }

  try {
    const layout = layoutWidget(document.root, layoutConstraints, { x: 0, y: 0 }, { registry });
    return {
      height: Math.max(1, Math.round(layout.rect.height)),
      width: Math.max(1, Math.round(layout.rect.width)),
    };
  } catch {
    return FALLBACK_FRAME_SIZE;
  }
}

export function resolveContainerLayoutConstraints(
  hostWidth: number,
  hostHeight: number,
  inset = 0,
): LayoutConstraints {
  return {
    minWidth: 0,
    maxWidth: Math.max(1, Math.floor(hostWidth) - inset),
    minHeight: 0,
    maxHeight: Math.max(1, Math.floor(hostHeight) - inset),
  };
}

export function JdwPreviewViewport({
  className,
  enablePrimaryPointerPan = true,
  fit = 'container',
  help = 'Ctrl + Scroll to zoom | Drag or scroll to pan',
  json,
  layoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
  registry,
  showReset = true,
  showViewportGrid = true,
  ...previewProps
}: JdwPreviewViewportProps) {
  const [hostElement, setHostElement] = useState<HTMLDivElement | null>(null);
  const [hostSize, setHostSize] = useState<{ height: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!hostElement) {
      return undefined;
    }

    const updateSize = () => {
      const rect = hostElement.getBoundingClientRect();
      const width = Math.max(0, Math.floor(rect.width));
      const height = Math.max(0, Math.floor(rect.height));
      setHostSize((current) =>
        current && current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    updateSize();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(hostElement);
    return () => observer.disconnect();
  }, [hostElement]);

  const effectiveConstraints = useMemo(() => {
    if (fit === 'container' && hostSize && hostSize.width > 0 && hostSize.height > 0) {
      return resolveContainerLayoutConstraints(hostSize.width, hostSize.height);
    }
    return layoutConstraints;
  }, [fit, hostSize, layoutConstraints]);

  const frame = useMemo(() => {
    if (fit === 'container' && hostSize && hostSize.width > 0 && hostSize.height > 0) {
      // Outside-in: host size is the frame. Layout still uses the same constraints.
      return {
        width: Math.max(1, Math.floor(hostSize.width)),
        height: Math.max(1, Math.floor(hostSize.height)),
      };
    }
    return resolveJdwPreviewFrameSize(json, effectiveConstraints, registry);
  }, [effectiveConstraints, fit, hostSize, json, registry]);
  const viewport = usePreviewViewport({
    contentHeight: frame.height,
    contentWidth: frame.width,
    enablePrimaryPointerPan,
    ignoreInteractiveTargets: true,
    viewportPadding: fit === 'container' ? 0 : 24,
  });

  const document = useMemo(() => createWidgetDocument(json), [json]);
  const canRenderViewport = document.root !== null && document.parseError === null;

  return (
    <div
      ref={setHostElement}
      className={cx('ui-jdw-preview-viewport-host', className)}
      data-fit={fit}
      data-testid="jdw-preview-viewport-host"
    >
      {!canRenderViewport ? (
        <JdwPreview
          {...previewProps}
          json={json}
          layoutConstraints={effectiveConstraints}
          registry={registry}
        />
      ) : hostSize === null ? null : (
        <WorkbenchPreviewCanvas
          className="ui-jdw-preview-viewport"
          data-testid="jdw-preview-viewport"
          frameHeight={frame.height}
          frameTitle="JDW Preview"
          frameWidth={frame.width}
          help={help}
          isPanning={viewport.isPanning}
          onResetView={showReset ? viewport.resetView : undefined}
          resetLabel={`Reset (${Math.round(viewport.effectiveZoom * 100)}%)`}
          resetTitle="Reset zoom and pan"
          showViewportGrid={showViewportGrid}
          showWindowFrame={false}
          stageStyle={viewport.stageStyle}
          viewportGridSize={8}
          viewportProps={{
            ref: viewport.setViewportElement,
          }}
        >
          <div
            className="ui-jdw-preview-viewport__stage"
            style={{ width: frame.width, height: frame.height }}
          >
            <JdwPreview
              {...previewProps}
              className="ui-jdw-preview-viewport__render"
              json={json}
              layoutConstraints={effectiveConstraints}
              registry={registry}
            />
          </div>
        </WorkbenchPreviewCanvas>
      )}
    </div>
  );
}
