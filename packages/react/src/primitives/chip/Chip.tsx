import './chip.css';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Button } from '../button';
import { cx } from '../../utils/cx';

export interface ChipProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  count?: number;
  label: ReactNode;
  onDismiss?: () => void;
}

/** Compact labeled control, optionally dismissible (close affordance). */
export function Chip({ className, count, label, onDismiss, type = 'button', ...props }: ChipProps) {
  return (
    <Button className={cx('ui-chip', 'ui-filter-chip', className)} type={type} {...props}>
      <span className="ui-chip__label ui-filter-chip__label">{label}</span>
      {count !== undefined ? (
        <span className="ui-chip__count ui-filter-chip__count">{count}</span>
      ) : null}
      {onDismiss ? (
        <span
          aria-hidden={true}
          className="ui-chip__dismiss ui-filter-chip__dismiss"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
        >
          <i className="codicon codicon-close" />
        </span>
      ) : null}
    </Button>
  );
}
