import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export type PanelProps = ComponentPropsWithRef<'div'>;

export function Panel({ className, ...props }: PanelProps) {
  return <div className={cx('ide-panel', className)} {...props} />;
}

export interface PanelHeaderProps extends ComponentPropsWithRef<'div'> {
  actions?: ReactNode;
}

export function PanelHeader({ actions, children, className, ...props }: PanelHeaderProps) {
  return (
    <div className={cx('panel-header', className)} {...props}>
      <span className="ui-panel-header__title">{children}</span>
      {actions ? <span className="ui-panel-header__actions">{actions}</span> : null}
    </div>
  );
}

export type PanelBodyProps = ComponentPropsWithRef<'div'>;

export function PanelBody({ className, ...props }: PanelBodyProps) {
  return <div className={cx('panel-body', className)} {...props} />;
}
