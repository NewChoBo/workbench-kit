import type { ComponentPropsWithRef, ReactNode } from 'react';
import { forwardRef, useId, useState } from 'react';
import { Badge } from '../primitives/Badge';
import { cx } from '../utils/cx';
import {
  SideBarList,
  SideBarListItem,
  type SideBarListItemProps,
  type SideBarListProps,
} from './SideBarViewFrame';

export type WorkbenchActionStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'waiting'
  | 'disabled';

export interface WorkbenchActionItem {
  danger?: boolean;
  description?: string;
  disabledReason?: string;
  icon?: ReactNode;
  id: string;
  label: string;
  metadata?: Record<string, unknown>;
  shortcut?: string;
  status?: WorkbenchActionStatus;
}

type WorkbenchSidebarHeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface WorkbenchSidebarSectionProps extends Omit<
  ComponentPropsWithRef<'section'>,
  'title'
> {
  actions?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  count?: number;
  defaultCollapsed?: boolean;
  headingLevel?: WorkbenchSidebarHeadingLevel;
  onCollapsedChange?: (collapsed: boolean) => void;
  title: ReactNode;
}

export function WorkbenchSidebarSection({
  actions,
  badge,
  children,
  className,
  collapsible = true,
  collapsed,
  count,
  defaultCollapsed = false,
  headingLevel = 3,
  id,
  onCollapsedChange,
  title,
  ...props
}: WorkbenchSidebarSectionProps) {
  const generatedId = useId();
  const sectionId = id ?? generatedId;
  const headingId = `${sectionId}-heading`;
  const contentId = `${sectionId}-content`;
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(defaultCollapsed);
  const resolvedCollapsed = collapsed ?? uncontrolledCollapsed;

  const handleToggle = () => {
    if (!collapsible) return;

    const nextCollapsed = !resolvedCollapsed;
    if (collapsed === undefined) {
      setUncontrolledCollapsed(nextCollapsed);
    }
    onCollapsedChange?.(nextCollapsed);
  };

  const resolvedBadge =
    badge ?? (count !== undefined ? <Badge variant="muted">{count}</Badge> : null);

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cx('ui-workbench-sidebar-section', className)}
      {...props}
    >
      <div className="ui-workbench-sidebar-section__header">
        {collapsible ? (
          <button
            aria-controls={contentId}
            aria-expanded={!resolvedCollapsed}
            className="ui-workbench-sidebar-section__toggle"
            type="button"
            onClick={handleToggle}
          >
            <i
              aria-hidden="true"
              className={cx(
                'codicon',
                resolvedCollapsed ? 'codicon-chevron-right' : 'codicon-chevron-down',
                'ui-workbench-sidebar-section__chevron',
              )}
            />
            <span
              id={headingId}
              aria-level={headingLevel}
              className="ui-workbench-sidebar-section__title"
              role="heading"
            >
              {title}
            </span>
          </button>
        ) : (
          <div className="ui-workbench-sidebar-section__static-title">
            <span className="ui-workbench-sidebar-section__chevron" />
            <span
              id={headingId}
              aria-level={headingLevel}
              className="ui-workbench-sidebar-section__title"
              role="heading"
            >
              {title}
            </span>
          </div>
        )}
        {resolvedBadge || actions ? (
          <div className="ui-workbench-sidebar-section__meta">
            {resolvedBadge}
            {actions}
          </div>
        ) : null}
      </div>
      <div
        id={contentId}
        className="ui-workbench-sidebar-section__content"
        hidden={resolvedCollapsed}
      >
        {children}
      </div>
    </section>
  );
}

export interface WorkbenchActionListProps extends SideBarListProps {
  empty?: boolean;
  emptyLabel?: ReactNode;
}

export function WorkbenchActionList({
  children,
  className,
  empty,
  emptyLabel = 'No actions',
  ...props
}: WorkbenchActionListProps) {
  return (
    <SideBarList className={cx('ui-workbench-action-list', className)} {...props}>
      {empty ? (
        <li className="ui-side-bar-list-entry">
          <div className="ui-workbench-action-list__empty">{emptyLabel}</div>
        </li>
      ) : (
        children
      )}
    </SideBarList>
  );
}

export interface WorkbenchActionListItemProps extends Omit<
  SideBarListItemProps,
  'children' | 'variant'
> {
  danger?: boolean;
  description?: ReactNode;
  disabledReason?: ReactNode;
  icon?: ReactNode;
  label: ReactNode;
  shortcut?: ReactNode;
  status?: WorkbenchActionStatus;
  statusLabel?: string;
  unavailable?: boolean;
}

const statusLabels: Record<WorkbenchActionStatus, string> = {
  completed: 'Completed',
  disabled: 'Disabled',
  failed: 'Failed',
  idle: 'Idle',
  running: 'Running',
  waiting: 'Waiting',
};

export const WorkbenchActionListItem = forwardRef<HTMLButtonElement, WorkbenchActionListItemProps>(
  function WorkbenchActionListItem(
    {
      className,
      danger,
      description,
      disabled,
      disabledReason,
      icon,
      label,
      shortcut,
      status = 'idle',
      statusLabel,
      title,
      unavailable,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const isUnavailable = unavailable || status === 'disabled';
    const resolvedDisabled = disabled || isUnavailable;
    const reasonId = disabledReason ? `${generatedId}-disabled-reason` : undefined;
    const resolvedStatusLabel = statusLabel ?? (unavailable ? 'Unavailable' : statusLabels[status]);
    const titleText =
      title ??
      (typeof disabledReason === 'string'
        ? disabledReason
        : unavailable
          ? 'Unavailable'
          : undefined);

    return (
      <SideBarListItem
        ref={ref}
        aria-busy={status === 'running' ? true : undefined}
        aria-describedby={reasonId}
        aria-disabled={resolvedDisabled ? true : undefined}
        className={cx(
          'ui-workbench-action-list-item',
          Boolean(description) && 'ui-workbench-action-list-item--with-description',
          danger && 'ui-workbench-action-list-item--danger',
          className,
        )}
        data-danger={danger ? 'true' : undefined}
        data-status={status}
        data-unavailable={unavailable ? 'true' : undefined}
        disabled={resolvedDisabled}
        title={titleText}
        {...props}
      >
        <span className="ui-workbench-action-list-item__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="ui-workbench-action-list-item__content">
          <span className="ui-workbench-action-list-item__label">{label}</span>
          {description ? (
            <span className="ui-workbench-action-list-item__description">{description}</span>
          ) : null}
          {disabledReason ? (
            <span id={reasonId} className="ui-visually-hidden">
              {disabledReason}
            </span>
          ) : null}
        </span>
        <span className="ui-workbench-action-list-item__meta">
          {shortcut ? (
            <kbd className="ui-workbench-action-list-item__shortcut">{shortcut}</kbd>
          ) : null}
        </span>
        <span
          aria-label={resolvedStatusLabel}
          className="ui-workbench-action-list-item__status"
          title={resolvedStatusLabel}
        >
          <span aria-hidden="true" className="ui-workbench-action-list-item__status-dot" />
        </span>
      </SideBarListItem>
    );
  },
);
