import type { ReactNode } from 'react';
import { Badge } from '../../primitives/Badge';
import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';

export interface ManagementGroupProps {
  children: ReactNode;
  className?: string | undefined;
  count?: number | undefined;
  icon?: string | undefined;
  label: ReactNode;
  labelId?: string | undefined;
  variant?: 'default' | 'section' | undefined;
}

export function ManagementGroups({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return <div className={cx('workbench-management-groups', className)}>{children}</div>;
}

export function ManagementGroup({
  children,
  className,
  count,
  icon,
  label,
  labelId,
  variant = 'default',
}: ManagementGroupProps) {
  return (
    <section
      aria-labelledby={labelId}
      className={cx(
        'workbench-management-group',
        variant === 'section' && 'workbench-management-group--section',
        className,
      )}
    >
      <header className="workbench-management-group__header">
        {icon ? (
          <i aria-hidden className={cx(cxCodicon(icon), 'workbench-management-group__icon')} />
        ) : null}
        <h3 className="workbench-management-group__title" id={labelId}>
          {label}
        </h3>
        {count !== undefined ? <Badge variant="muted">{count}</Badge> : null}
      </header>
      {children}
    </section>
  );
}
