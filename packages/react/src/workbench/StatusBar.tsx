import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import {
  getWorkbenchStatusLabel,
  isWorkbenchStatusBusy,
  isWorkbenchStatusDisabled,
  type WorkbenchStatus,
} from './status';

export type StatusBarSectionAlign = 'end' | 'start';

export interface StatusBarItemModel {
  active?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  order?: number;
  hidden?: boolean;
  icon?: ReactNode | string;
  id: string;
  label: ReactNode;
  status?: WorkbenchStatus;
  title?: string;
}

export interface StatusBarSectionModel {
  order?: number;
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
    sortByOrderPriority(sections ?? [])
      ?.filter((section) => !section.hidden)
      .map((section) => (
        <StatusBarSection key={section.id} align={section.align}>
          {sortByOrderPriority(section.items)
            .filter((item) => !item.hidden)
            .map((item) => (
              <StatusBarItem
                key={item.id}
                active={item.active}
                aria-label={item.ariaLabel}
                disabled={item.disabled}
                icon={item.icon}
                status={item.status}
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

function sortByOrderPriority<T extends { order?: number }>(values: readonly T[]): T[] {
  return [...values]
    .map((value, sourceIndex) => ({ value, sourceIndex }))
    .sort((left, right) => {
      const leftOrder = left.value.order;
      const rightOrder = right.value.order;

      if (leftOrder !== rightOrder) {
        if (leftOrder === undefined) return 1;
        if (rightOrder === undefined) return -1;
        return leftOrder - rightOrder;
      }
      return left.sourceIndex - right.sourceIndex;
    })
    .map(({ value }) => value);
}

export interface StatusBarSectionProps extends ComponentPropsWithRef<'div'> {
  align?: StatusBarSectionAlign | undefined;
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
  active?: boolean | undefined;
  icon?: ReactNode | string | undefined;
  status?: WorkbenchStatus | undefined;
}

function resolveStatusBarIcon(icon: ReactNode | string | undefined) {
  if (typeof icon !== 'string') return icon;

  return <i className={cxCodicon(icon)} aria-hidden="true" />;
}

export function StatusBarItem({
  active,
  children,
  className,
  disabled,
  icon,
  status,
  title,
  type = 'button',
  ...props
}: StatusBarItemProps) {
  const statusLabel = status ? getWorkbenchStatusLabel(status) : undefined;
  const resolvedDisabled = disabled || Boolean(status && isWorkbenchStatusDisabled(status));
  const resolvedIcon = resolveStatusBarIcon(icon);

  return (
    <button
      type={type}
      className={cx(
        'ui-workbench-status-bar__item',
        active && 'ui-workbench-status-bar__item--active',
        className,
      )}
      data-active={active ? 'true' : undefined}
      data-status={status}
      aria-busy={status && isWorkbenchStatusBusy(status) ? true : undefined}
      disabled={resolvedDisabled}
      title={title ?? statusLabel}
      {...props}
    >
      {resolvedIcon ? <span className="ui-workbench-status-bar__icon">{resolvedIcon}</span> : null}
      <span className="ui-workbench-status-bar__label">{children}</span>
      {status ? (
        <span
          aria-label={statusLabel}
          className="ui-workbench-status-bar__status"
          title={statusLabel}
        >
          <span aria-hidden="true" className="ui-workbench-status-bar__status-dot" />
        </span>
      ) : null}
    </button>
  );
}
