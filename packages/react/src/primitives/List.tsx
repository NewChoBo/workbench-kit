import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface ListProps extends ComponentPropsWithRef<'div'> {
  ariaLabel?: string;
}

export function List({ ariaLabel, className, role = 'listbox', ...props }: ListProps) {
  return (
    <div
      aria-label={ariaLabel ?? props['aria-label']}
      className={cx('ui-list', className)}
      role={role}
      {...props}
    />
  );
}

export interface ListItemProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  actions?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode | string;
  label: ReactNode;
  leading?: ReactNode;
  meta?: ReactNode;
  selected?: boolean;
}

export function ListItem({
  actions,
  className,
  description,
  icon,
  label,
  leading,
  meta,
  role = 'option',
  selected = false,
  tabIndex = 0,
  ...props
}: ListItemProps) {
  const hasDescription = description !== undefined && description !== null && description !== '';
  const resolvedIcon =
    typeof icon === 'string' ? (
      <i className={`codicon ${icon.startsWith('codicon-') ? icon : `codicon-${icon}`}`} />
    ) : (
      icon
    );

  return (
    <div
      aria-selected={selected}
      className={cx('ui-list-item', selected && 'ui-list-item--selected', className)}
      role={role}
      tabIndex={tabIndex}
      {...props}
    >
      {leading ??
        (resolvedIcon ? <span className="ui-list-item__icon">{resolvedIcon}</span> : null)}
      <span className="ui-list-item__content">
        <span className="ui-list-item__label">{label}</span>
        {hasDescription ? <span className="ui-list-item__description">{description}</span> : null}
      </span>
      {meta ? <span className="ui-list-item__meta">{meta}</span> : null}
      {actions ? <span className="ui-list-item__actions">{actions}</span> : null}
    </div>
  );
}

export interface ListEmptyStateProps extends ComponentPropsWithRef<'div'> {
  tone?: 'error' | 'normal';
}

export function ListEmptyState({ className, tone = 'normal', ...props }: ListEmptyStateProps) {
  return (
    <div
      className={cx(
        'ui-list-empty-state',
        tone === 'error' && 'ui-list-empty-state--error',
        className,
      )}
      {...props}
    />
  );
}
