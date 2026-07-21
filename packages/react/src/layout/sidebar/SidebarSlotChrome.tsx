import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../../utils/cx';
import { PanelHeader } from '../panel/Panel';

export interface SidebarSlotChromeProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  readonly actions?: ReactNode;
  readonly leading?: ReactNode;
  readonly reserveActionsSlot?: boolean;
}

/**
 * Shared primary/secondary sidebar slot header: leading title or tab strip, trailing actions.
 */
export function SidebarSlotChrome({
  actions,
  className,
  leading,
  reserveActionsSlot,
  ...props
}: SidebarSlotChromeProps): ReactNode {
  return (
    <PanelHeader
      actions={actions}
      className={cx('ui-sidebar-view__header', 'ui-sidebar-slot-chrome', className)}
      reserveActionsSlot={reserveActionsSlot ?? Boolean(actions)}
      {...props}
    >
      {leading}
    </PanelHeader>
  );
}
