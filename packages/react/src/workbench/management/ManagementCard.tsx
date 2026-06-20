import type { ReactNode } from 'react';
import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';

export type ManagementCardIconTone = 'editor' | 'feature' | 'language' | 'neutral' | 'theme';

export type ManagementCardLayout = 'media' | 'row' | 'stack';

export interface ManagementCardProps {
  actions?: ReactNode;
  active?: boolean;
  badges?: ReactNode;
  children?: ReactNode;
  className?: string | undefined;
  description?: ReactNode;
  icon?: string | undefined;
  iconTone?: ManagementCardIconTone;
  id?: ReactNode;
  layout?: ManagementCardLayout;
  subtitle?: ReactNode;
  title: ReactNode;
}

export function ManagementCard({
  actions,
  active = false,
  badges,
  children,
  className,
  description,
  icon,
  iconTone = 'neutral',
  id,
  layout = icon ? 'media' : 'stack',
  subtitle,
  title,
}: ManagementCardProps) {
  const resolvedLayout = icon ? 'media' : layout;

  return (
    <article
      className={cx(
        'workbench-management-card',
        resolvedLayout === 'media' && 'workbench-management-card--media',
        resolvedLayout === 'row' && 'workbench-management-card--row',
        resolvedLayout === 'stack' && 'workbench-management-card--stack',
        active && 'workbench-management-card--active',
        className,
      )}
    >
      {resolvedLayout === 'media' && icon ? (
        <div
          aria-hidden
          className={cx(
            'workbench-management-card__icon-wrap',
            `workbench-management-card__icon-wrap--${iconTone}`,
          )}
        >
          <i className={cx(cxCodicon(icon), 'workbench-management-card__icon')} />
        </div>
      ) : null}
      <div className="workbench-management-card__body">
        <div className="workbench-management-card__header">
          <div className="workbench-management-card__titles">
            <span className="workbench-management-card__title">{title}</span>
            {subtitle ? <p className="workbench-management-card__subtitle">{subtitle}</p> : null}
          </div>
          {badges ? <div className="workbench-management-card__badges">{badges}</div> : null}
        </div>
        {id ? <code className="workbench-management-card__id">{id}</code> : null}
        {description ? (
          <p className="workbench-management-card__description">{description}</p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="workbench-management-card__actions">{actions}</div> : null}
    </article>
  );
}

export function ManagementCardList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return <ul className={cx('workbench-management-card-list', className)}>{children}</ul>;
}
