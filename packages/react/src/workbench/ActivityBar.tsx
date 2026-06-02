import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface ActivityBarItem {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  id: string;
  label: string;
  title?: string;
}

export interface ActivityBarProps extends Omit<ComponentPropsWithoutRef<'nav'>, 'children'> {
  items: ActivityBarItem[];
  onItemActivate?: (item: ActivityBarItem) => void;
  secondaryItems?: ActivityBarItem[];
}

export function ActivityBar({
  'aria-label': ariaLabel = 'Activity bar',
  className,
  items,
  onItemActivate,
  secondaryItems = [],
  ...props
}: ActivityBarProps) {
  const renderItem = (item: ActivityBarItem) => (
    <button
      key={item.id}
      type="button"
      aria-label={item.label}
      aria-pressed={item.active}
      className={cx(
        'ui-workbench-activity-bar__item',
        item.active && 'ui-workbench-activity-bar__item--active',
      )}
      disabled={item.disabled}
      title={item.title ?? item.label}
      onClick={() => onItemActivate?.(item)}
    >
      <span className="ui-workbench-activity-bar__icon">{item.icon}</span>
    </button>
  );

  return (
    <nav aria-label={ariaLabel} className={cx('ui-workbench-activity-bar', className)} {...props}>
      {items.map(renderItem)}
      {secondaryItems.length ? <span className="ui-workbench-activity-bar__spacer" /> : null}
      {secondaryItems.map(renderItem)}
    </nav>
  );
}
