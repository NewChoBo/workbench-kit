import type { ComponentPropsWithRef } from 'react';

import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';

export interface WorkbenchMediaPlaceholderProps extends ComponentPropsWithRef<'span'> {
  icon?: string;
  iconClassName?: string;
}

/**
 * Default empty-state surface for {@link WorkbenchMediaSlot}: fills the slot box and centers a codicon.
 */
export function WorkbenchMediaPlaceholder({
  className,
  icon = 'file-media',
  iconClassName,
  ...props
}: WorkbenchMediaPlaceholderProps) {
  return (
    <span aria-hidden className={cx('ui-workbench-media-slot__placeholder', className)} {...props}>
      <i className={cx('ui-workbench-media-slot__icon', iconClassName, cxCodicon(icon))} />
    </span>
  );
}
