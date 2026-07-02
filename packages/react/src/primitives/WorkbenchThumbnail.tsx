import type { ComponentPropsWithRef } from 'react';

import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import { useWorkbenchMediaImage } from '../utils/useWorkbenchMediaImage';

export type WorkbenchThumbnailSize = 'sm' | 'md';

export interface WorkbenchThumbnailProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  alt?: string | undefined;
  fallbackIcon?: string | undefined;
  imageUrl?: string | null | undefined;
  size?: WorkbenchThumbnailSize | undefined;
}

export function WorkbenchThumbnail({
  alt,
  className,
  fallbackIcon = 'file-media',
  imageUrl = null,
  size = 'sm',
  ...props
}: WorkbenchThumbnailProps) {
  const media = useWorkbenchMediaImage(imageUrl);

  return (
    <span
      aria-hidden={alt ? undefined : true}
      className={cx('ui-workbench-thumbnail', className)}
      data-size={size}
      {...props}
    >
      {media.shouldShowImage ? (
        <img
          alt={alt ?? ''}
          className="ui-workbench-thumbnail__image"
          onError={media.onImageError}
          src={media.imageSrc}
        />
      ) : (
        <i className={cx('ui-workbench-thumbnail__icon', cxCodicon(fallbackIcon))} />
      )}
    </span>
  );
}
