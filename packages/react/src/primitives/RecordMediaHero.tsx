import type { ComponentPropsWithRef } from 'react';

import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';

export interface RecordMediaHeroProps extends ComponentPropsWithRef<'div'> {
  alt?: string | undefined;
  fallbackIcon?: string | undefined;
  imageUrl?: string | null | undefined;
  logoUrl?: string | null | undefined;
}

export function RecordMediaHero({
  alt,
  className,
  fallbackIcon = 'file-media',
  imageUrl = null,
  logoUrl = null,
  ...props
}: RecordMediaHeroProps) {
  const hasImage = imageUrl !== null && imageUrl !== undefined && imageUrl !== '';
  const hasLogo = logoUrl !== null && logoUrl !== undefined && logoUrl !== '';

  return (
    <div className={cx('ui-record-media-hero', className)} {...props}>
      {hasImage ? (
        <img alt={alt ?? ''} className="ui-record-media-hero__image" src={imageUrl} />
      ) : (
        <div aria-hidden className="ui-record-media-hero__fallback">
          <i className={cxCodicon(fallbackIcon)} />
        </div>
      )}
      {hasLogo ? <img alt="" className="ui-record-media-hero__logo" src={logoUrl} /> : null}
    </div>
  );
}
