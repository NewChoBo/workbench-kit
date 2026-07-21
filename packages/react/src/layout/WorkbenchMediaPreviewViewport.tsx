import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { Button } from '../primitives/button';
import { cx } from '../utils/cx';
import { usePreviewViewport } from './usePreviewViewport';

export interface WorkbenchMediaPreviewViewportProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  readonly alt?: string | undefined;
  readonly help?: ReactNode | undefined;
  readonly imageUrl: string;
  readonly maxZoom?: number | undefined;
  readonly minZoom?: number | undefined;
  readonly resetLabel?: ReactNode | undefined;
  readonly resetTitle?: string | undefined;
  readonly showReset?: boolean | undefined;
}

export function WorkbenchMediaPreviewViewport({
  alt = '',
  className,
  help = 'Ctrl + Scroll to zoom | Drag to pan',
  imageUrl,
  maxZoom,
  minZoom,
  resetLabel,
  resetTitle = 'Reset zoom and pan',
  showReset = true,
  ...props
}: WorkbenchMediaPreviewViewportProps) {
  const [contentSize, setContentSize] = useState<{ height: number; width: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const viewport = usePreviewViewport({
    contentHeight: contentSize?.height,
    contentWidth: contentSize?.width,
    maxZoom,
    minZoom,
  });

  const syncContentSize = useCallback((image: HTMLImageElement) => {
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      return;
    }

    setContentSize({
      height: image.naturalHeight,
      width: image.naturalWidth,
    });
  }, []);

  const handleImageLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      syncContentSize(event.currentTarget);
    },
    [syncContentSize],
  );

  useLayoutEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    if (image.complete) {
      syncContentSize(image);
    }
  }, [imageUrl, syncContentSize]);

  const resolvedResetLabel = resetLabel ?? `Reset (${Math.round(viewport.effectiveZoom * 100)}%)`;

  return (
    <div
      className={cx('ui-workbench-media-preview-viewport', className)}
      data-ui-workbench-media-preview-viewport="true"
      {...props}
      ref={viewport.setViewportElement}
    >
      {showReset ? (
        <Button
          compact
          className="ui-workbench-media-preview-viewport__reset"
          type="button"
          onClick={viewport.resetView}
          title={resetTitle}
        >
          {resolvedResetLabel}
        </Button>
      ) : null}

      <div
        className="ui-workbench-media-preview-viewport__stage"
        data-panning={viewport.isPanning ? 'true' : 'false'}
        style={viewport.stageStyle}
      >
        <img
          alt={alt}
          className="ui-workbench-media-preview-viewport__image"
          draggable={false}
          ref={imageRef}
          src={imageUrl}
          onDragStart={(event) => {
            event.preventDefault();
          }}
          onLoad={handleImageLoad}
        />
      </div>

      {help ? <div className="ui-workbench-media-preview-viewport__help">{help}</div> : null}
    </div>
  );
}
