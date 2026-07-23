import './catalog-browse-card.css';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../../utils/cx';
import { WorkbenchMediaSlot } from '../workbench-media-slot';

export type CatalogBrowseCardVariant = 'cover' | 'row';

export interface CatalogBrowseCardProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'title'
> {
  description?: ReactNode;
  icon?: string;
  imageAlt?: string;
  imageUrl?: string | null;
  label: ReactNode;
  /**
   * Custom media content for the icon/cover region. When set, replaces the
   * default `WorkbenchMediaSlot` (imageUrl / fallback icon).
   */
  media?: ReactNode;
  /** Overlay content inside the media region (badges, status chips, etc.). */
  mediaOverlay?: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
  /**
   * Secondary actions outside the primary hit target (for example Assign).
   * When set, the root becomes a non-button container and click/drag handlers
   * apply to the main control only.
   */
  trailing?: ReactNode;
  tooltip?: string;
  variant?: CatalogBrowseCardVariant;
}

export function CatalogBrowseCard({
  className,
  description,
  icon = 'library',
  imageAlt,
  imageUrl = null,
  label,
  media,
  mediaOverlay,
  meta,
  selected = false,
  tooltip,
  trailing,
  type = 'button',
  variant = 'row',
  ...props
}: CatalogBrowseCardProps) {
  const hasDescription = description !== undefined && description !== null && description !== '';
  const hasMeta = meta !== undefined && meta !== null && meta !== '';
  const hasMediaOverlay = mediaOverlay !== undefined && mediaOverlay !== null;
  const hasCustomMedia = media !== undefined && media !== null;
  const hasTrailing = trailing !== undefined && trailing !== null && trailing !== false;

  const mediaRegion = (
    <span
      aria-hidden={hasMediaOverlay ? undefined : true}
      className={cx(
        'ui-catalog-browse-card__icon',
        hasMediaOverlay && 'ui-catalog-browse-card__icon--overlay',
      )}
    >
      {hasCustomMedia ? (
        <span className="ui-catalog-browse-card__media-custom">{media}</span>
      ) : (
        <WorkbenchMediaSlot
          alt={imageAlt}
          className="ui-catalog-browse-card__media"
          fallbackIcon={icon}
          imageClassName="ui-catalog-browse-card__image"
          imageUrl={imageUrl}
        />
      )}
      {hasMediaOverlay ? (
        <span className="ui-catalog-browse-card__media-overlay">{mediaOverlay}</span>
      ) : null}
    </span>
  );

  const bodyRegion = (
    <span className="ui-catalog-browse-card__body">
      <span className="ui-catalog-browse-card__title">{label}</span>
      {hasMeta ? <span className="ui-catalog-browse-card__meta">{meta}</span> : null}
      {hasDescription ? (
        <span className="ui-catalog-browse-card__description">{description}</span>
      ) : null}
    </span>
  );

  const rootClassName = cx(
    'ui-catalog-browse-card',
    variant === 'cover' && 'ui-catalog-browse-card--cover',
    selected && 'ui-catalog-browse-card--selected',
    hasTrailing && 'ui-catalog-browse-card--with-trailing',
    className,
  );

  if (!hasTrailing) {
    return (
      <button className={rootClassName} type={type} title={tooltip} {...props}>
        {mediaRegion}
        {bodyRegion}
      </button>
    );
  }

  return (
    <div className={rootClassName}>
      <button className="ui-catalog-browse-card__main" type={type} title={tooltip} {...props}>
        {mediaRegion}
        {bodyRegion}
      </button>
      <div className="ui-catalog-browse-card__trailing">{trailing}</div>
    </div>
  );
}
