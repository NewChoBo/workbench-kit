import type { ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface FieldProps {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  htmlFor?: string;
  inline?: boolean;
  label?: ReactNode;
}

export function Field({
  label,
  children,
  className,
  description,
  htmlFor,
  inline = false,
}: FieldProps) {
  const labelElement = !label ? null : htmlFor ? (
    <label className="ui-field__label" htmlFor={htmlFor}>
      {label}
    </label>
  ) : (
    <span className="ui-field__label">{label}</span>
  );

  return (
    <div className={cx('ui-field', inline && 'ui-field--inline', className)}>
      <div>
        {labelElement}
        {description && <div className="ui-field__description">{description}</div>}
      </div>
      {children}
    </div>
  );
}
