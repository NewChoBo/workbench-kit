import type { ComponentPropsWithRef, ReactNode } from 'react';
import { forwardRef, useId, useState } from 'react';
import { Badge } from '../primitives/Badge';
import { cxCodicon } from '../utils/codicon';
import { cx } from '../utils/cx';
import {
  getWorkbenchStatusLabel,
  isWorkbenchStatusBusy,
  isWorkbenchStatusDisabled,
  type WorkbenchStatus,
} from '../workbench/status';
import {
  SideBarList,
  SideBarListItem,
  type SideBarListItemProps,
  type SideBarListProps,
} from './SideBarViewFrame';

export type WorkbenchActionStatus = WorkbenchStatus;

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

export interface WorkbenchSidebarSectionHeaderProps {
  actions?: ReactNode;
  badge?: ReactNode;
  collapsible?: boolean;
  collapsed: boolean;
  contentId?: string;
  headingId: string;
  headingLevel?: WorkbenchSidebarHeadingLevel;
  onToggle?: () => void;
  title: ReactNode;
}

export function WorkbenchSidebarSectionHeader({
  actions,
  badge,
  collapsible = true,
  collapsed,
  contentId,
  headingId,
  headingLevel = 3,
  onToggle,
  title,
}: WorkbenchSidebarSectionHeaderProps) {
  return (
    <div className="ui-workbench-sidebar-section__header">
      {collapsible ? (
        <button
          aria-controls={contentId}
          aria-expanded={!collapsed}
          className="ui-workbench-sidebar-section__toggle"
          type="button"
          onClick={onToggle}
        >
          <i
            aria-hidden="true"
            className={cxCodicon(
              collapsed ? 'chevron-right' : 'chevron-down',
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
      {badge || actions ? (
        <div className="ui-workbench-sidebar-section__meta">
          {badge}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

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
      <WorkbenchSidebarSectionHeader
        actions={actions}
        badge={resolvedBadge}
        collapsible={collapsible}
        collapsed={resolvedCollapsed}
        contentId={contentId}
        headingId={headingId}
        headingLevel={headingLevel}
        title={title}
        onToggle={handleToggle}
      />
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
  showStatus?: boolean;
  status?: WorkbenchActionStatus;
  statusLabel?: string;
  unavailable?: boolean;
}

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
      showStatus = true,
      status = 'idle',
      statusLabel,
      title,
      unavailable,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const resolvedStatus = unavailable ? 'unavailable' : status;
    const resolvedDisabled = disabled || isWorkbenchStatusDisabled(resolvedStatus);
    const reasonId = disabledReason ? `${generatedId}-disabled-reason` : undefined;
    const resolvedStatusLabel = statusLabel ?? getWorkbenchStatusLabel(resolvedStatus);
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
        aria-busy={isWorkbenchStatusBusy(resolvedStatus) ? true : undefined}
        aria-describedby={reasonId}
        aria-disabled={resolvedDisabled ? true : undefined}
        className={cx(
          'ui-workbench-action-list-item',
          Boolean(description) && 'ui-workbench-action-list-item--with-description',
          danger && 'ui-workbench-action-list-item--danger',
          className,
        )}
        data-danger={danger ? 'true' : undefined}
        data-show-status={showStatus ? 'true' : 'false'}
        data-status={resolvedStatus}
        data-unavailable={unavailable ? 'true' : undefined}
        disabled={resolvedDisabled || isWorkbenchStatusDisabled(resolvedStatus)}
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
        {showStatus ? (
          <span
            aria-label={resolvedStatusLabel}
            className="ui-workbench-action-list-item__status"
            title={resolvedStatusLabel}
          >
            <span aria-hidden="true" className="ui-workbench-action-list-item__status-dot" />
          </span>
        ) : null}
      </SideBarListItem>
    );
  },
);
