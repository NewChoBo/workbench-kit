import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../utils/cx';

export type StatusBarSectionAlign = 'end' | 'start';

export interface StatusBarItemModel {
  active?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  hidden?: boolean;
  icon?: ReactNode;
  id: string;
  label: ReactNode;
  title?: string;
}

export interface StatusBarSectionModel {
  align?: StatusBarSectionAlign;
  hidden?: boolean;
  id: string;
  items: StatusBarItemModel[];
}

export interface StatusBarProps extends ComponentPropsWithRef<'footer'> {
  compact?: boolean;
  onItemActivate?: (item: StatusBarItemModel) => void;
  sections?: StatusBarSectionModel[];
}

export function StatusBar({
  'aria-label': ariaLabel = 'Status bar',
  children,
  className,
  compact,
  onItemActivate,
  sections,
  ...props
}: StatusBarProps) {
  const content =
    children ??
    sections
      ?.filter((section) => !section.hidden)
      .map((section) => (
        <StatusBarSection key={section.id} align={section.align}>
          {section.items
            .filter((item) => !item.hidden)
            .map((item) => (
              <StatusBarItem
                key={item.id}
                active={item.active}
                aria-label={item.ariaLabel}
                disabled={item.disabled}
                icon={item.icon}
                title={item.title}
                onClick={() => onItemActivate?.(item)}
              >
                {item.label}
              </StatusBarItem>
            ))}
        </StatusBarSection>
      ));

  return (
    <footer
      aria-label={ariaLabel}
      className={cx(
        'ui-workbench-status-bar',
        compact && 'ui-workbench-status-bar--compact',
        className,
      )}
      {...props}
    >
      {content}
    </footer>
  );
}

export interface StatusBarSectionProps extends ComponentPropsWithRef<'div'> {
  align?: StatusBarSectionAlign;
}

export function StatusBarSection({ align = 'start', className, ...props }: StatusBarSectionProps) {
  return (
    <div
      className={cx(
        'ui-workbench-status-bar__section',
        align === 'end' && 'ui-workbench-status-bar__section--end',
        className,
      )}
      {...props}
    />
  );
}

export interface StatusBarItemProps extends ComponentPropsWithRef<'button'> {
  active?: boolean;
  icon?: ReactNode;
}

export function StatusBarItem({
  active,
  children,
  className,
  icon,
  type = 'button',
  ...props
}: StatusBarItemProps) {
  return (
    <button
      type={type}
      className={cx(
        'ui-workbench-status-bar__item',
        active && 'ui-workbench-status-bar__item--active',
        className,
      )}
      data-active={active ? 'true' : undefined}
      {...props}
    >
      {icon ? <span className="ui-workbench-status-bar__icon">{icon}</span> : null}
      <span className="ui-workbench-status-bar__label">{children}</span>
    </button>
  );
}
