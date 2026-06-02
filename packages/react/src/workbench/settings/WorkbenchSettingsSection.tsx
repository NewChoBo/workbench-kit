import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface WorkbenchSettingsSectionProps {
  children: ReactNode;
  id: string;
  title: ReactNode;
  className?: string;
  description?: ReactNode;
}

export function WorkbenchSettingsSection({
  children,
  className,
  description,
  id,
  title,
}: WorkbenchSettingsSectionProps) {
  return (
    <section className={cx('workbench-settings-section', className)} aria-labelledby={id}>
      <h2 id={id} className="workbench-settings-section__title">
        {title}
      </h2>
      {description ? (
        <p className="workbench-settings-section__description">{description}</p>
      ) : null}
      {children}
    </section>
  );
}
