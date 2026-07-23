import './media-slot.css';
import type { ComponentPropsWithRef, ElementType, ReactNode } from 'react';

import { cx } from '../../utils/cx';
import { useWorkbenchMediaImage } from '../../utils/useWorkbenchMediaImage';
import { WorkbenchMediaPlaceholder } from './WorkbenchMediaPlaceholder';

export interface WorkbenchMediaSlotProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  alt?: string;
  as?: 'div' | 'span';
  fallback?: ReactNode;
  fallbackClassName?: string;
  fallbackIcon?: string;
  /** Stretch to fill the parent box (hero/cover surfaces). */
  fill?: boolean;
  imageClassName?: string;
  imageUrl?: string | null;
  /**
   * Native image loading hint. Defaults to `lazy` for list/thumbnail surfaces.
   * Pass `eager` for above-the-fold heroes and detail identity art.
   */
  loading?: 'eager' | 'lazy';
}

export function WorkbenchMediaSlot({
  alt,
  as: Component = 'span',
  className,
  fallback,
  fallbackClassName,
  fallbackIcon = 'file-media',
  fill = false,
  imageClassName,
  imageUrl = null,
  loading = 'lazy',
  ...props
}: WorkbenchMediaSlotProps) {
  const media = useWorkbenchMediaImage(imageUrl);

  return (
    <Component
      className={cx('ui-workbench-media-slot', fill && 'ui-workbench-media-slot--fill', className)}
      {...(props as ComponentPropsWithRef<ElementType>)}
    >
      {media.shouldShowImage ? (
        <img
          alt={alt ?? ''}
          className={cx('ui-workbench-media-slot__image', imageClassName)}
          loading={loading}
          onError={media.onImageError}
          src={media.imageSrc}
        />
      ) : (
        (fallback ?? (
          <WorkbenchMediaPlaceholder icon={fallbackIcon} iconClassName={fallbackClassName} />
        ))
      )}
    </Component>
  );
}
