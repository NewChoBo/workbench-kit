import './thumbnail.css';
import type { ComponentPropsWithRef } from 'react';

import { cx } from '../../utils/cx';
import { WorkbenchMediaSlot } from '../workbench-media-slot';

export type WorkbenchThumbnailSize = 'sm' | 'md' | 'library' | 'icon';

export interface WorkbenchThumbnailProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  alt?: string;
  fallbackIcon?: string;
  imageUrl?: string | null;
  size?: WorkbenchThumbnailSize;
}

export function WorkbenchThumbnail({
  alt,
  className,
  fallbackIcon = 'file-media',
  imageUrl = null,
  size = 'sm',
  ...props
}: WorkbenchThumbnailProps) {
  return (
    <WorkbenchMediaSlot
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={cx('ui-workbench-thumbnail', className)}
      data-size={size}
      fallbackClassName="ui-workbench-thumbnail__icon"
      fallbackIcon={fallbackIcon}
      fill
      imageClassName="ui-workbench-thumbnail__image"
      imageUrl={imageUrl}
      {...props}
    />
  );
}
