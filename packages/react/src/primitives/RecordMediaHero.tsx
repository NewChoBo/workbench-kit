import type { ComponentPropsWithRef, CSSProperties } from 'react';

import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import { useWorkbenchMediaImage } from '../utils/useWorkbenchMediaImage';

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
  const coverMedia = useWorkbenchMediaImage(imageUrl);
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
      {coverMedia.shouldShowImage ? (
        <img
          alt={alt ?? ''}
          className="ui-record-media-hero__image"
          onError={coverMedia.onImageError}
          src={coverMedia.imageSrc}
        />
      ) : (
        <div aria-hidden className="ui-record-media-hero__fallback">
          <i className={cxCodicon(fallbackIcon)} />
        </div>
      )}
      {logoMedia.shouldShowImage ? (
        <img
          alt=""
          className="ui-record-media-hero__logo"
          onError={logoMedia.onImageError}
          src={logoMedia.imageSrc}
        />
      ) : null}
    </div>
  );
}
