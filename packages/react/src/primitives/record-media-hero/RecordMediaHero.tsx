import './record-media-hero.css';
import type { ComponentPropsWithRef, CSSProperties } from 'react';

import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';
import { useWorkbenchMediaImage } from '../../utils/useWorkbenchMediaImage';
import { WorkbenchMediaSlot } from '../workbench-media-slot';

export type RecordMediaHeroLayout = 'banner' | 'compact' | 'background';

export interface RecordMediaHeroProps extends ComponentPropsWithRef<'div'> {
  alt?: string | undefined;
  fallbackIcon?: string | undefined;
  imageUrl?: string | null | undefined;
  layout?: RecordMediaHeroLayout | undefined;
  logoUrl?: string | null | undefined;
  maxWidth?: number | string | undefined;
}

function resolveMaxWidth(maxWidth: number | string | undefined): CSSProperties['maxWidth'] {
  if (maxWidth === undefined) {
    return undefined;
  }

  return typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
}

export function RecordMediaHero({
  alt,
  className,
  fallbackIcon = 'file-media',
  imageUrl = null,
  layout = 'banner',
  logoUrl = null,
  maxWidth,
  style,
  ...props
}: RecordMediaHeroProps) {
  const logoMedia = useWorkbenchMediaImage(logoUrl);
  const resolvedMaxWidth = resolveMaxWidth(maxWidth);

  return (
    <div
      className={cx(
        'ui-record-media-hero',
        layout === 'compact' && 'ui-record-media-hero--compact',
        layout === 'background' && 'ui-record-media-hero--background',
        className,
      )}
      style={{
        ...(resolvedMaxWidth !== undefined ? { maxWidth: resolvedMaxWidth } : undefined),
        ...style,
      }}
      {...props}
    >
      <WorkbenchMediaSlot
        alt={alt}
        as="div"
        className="ui-record-media-hero__surface"
        fallback={
          <div aria-hidden className="ui-record-media-hero__fallback">
            <i className={cxCodicon(fallbackIcon)} />
          </div>
        }
        fill
        imageClassName="ui-record-media-hero__image"
        imageUrl={imageUrl}
        loading="eager"
      />
      {logoMedia.shouldShowImage ? (
        <img
          alt=""
          className="ui-record-media-hero__logo"
          loading="eager"
          onError={logoMedia.onImageError}
          src={logoMedia.imageSrc}
        />
      ) : null}
    </div>
  );
}
