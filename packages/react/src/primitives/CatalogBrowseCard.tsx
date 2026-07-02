import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';

export type CatalogBrowseCardVariant = 'cover' | 'row';

export interface CatalogBrowseCardProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'title'
> {
  description?: ReactNode;
  icon?: string | undefined;
  imageAlt?: string | undefined;
  imageUrl?: string | null | undefined;
  label: ReactNode;
  meta?: ReactNode;
  selected?: boolean | undefined;
  tooltip?: string | undefined;
  variant?: CatalogBrowseCardVariant | undefined;
}

export function CatalogBrowseCard({
  className,
  description,
  icon = 'library',
  imageAlt,
  imageUrl = null,
  label,
  meta,
  selected = false,
  tooltip,
  type = 'button',
  variant = 'row',
  ...props
}: CatalogBrowseCardProps) {
  const hasDescription = description !== undefined && description !== null && description !== '';
  const hasMeta = meta !== undefined && meta !== null && meta !== '';
  const hasImage = imageUrl !== null && imageUrl !== undefined && imageUrl !== '';

  return (
    <button
      className={cx(
        'ui-catalog-browse-card',
        variant === 'cover' && 'ui-catalog-browse-card--cover',
        selected && 'ui-catalog-browse-card--selected',
        className,
      )}
      type={type}
      title={tooltip}
      {...props}
    >
      <span aria-hidden className="ui-catalog-browse-card__icon">
        {hasImage ? (
          <img alt={imageAlt ?? ''} className="ui-catalog-browse-card__image" src={imageUrl} />
        ) : (
          <i className={cxCodicon(icon)} />
        )}
      </span>
      <span className="ui-catalog-browse-card__body">
        <span className="ui-catalog-browse-card__title">{label}</span>
        {hasMeta ? <span className="ui-catalog-browse-card__meta">{meta}</span> : null}
        {hasDescription ? (
          <span className="ui-catalog-browse-card__description">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
