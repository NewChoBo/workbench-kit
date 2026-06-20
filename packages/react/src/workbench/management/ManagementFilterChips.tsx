import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface ManagementFilterChipOption<TValue extends string> {
  label: ReactNode;
  value: TValue;
}

export interface ManagementFilterChipsProps<TValue extends string> {
  ariaLabel: string;
  onChange: (value: TValue) => void;
  options: readonly ManagementFilterChipOption<TValue>[];
  value: TValue;
}

export function ManagementFilterChips<TValue extends string>({
  ariaLabel,
  onChange,
  options,
  value,
}: ManagementFilterChipsProps<TValue>) {
  return (
    <div aria-label={ariaLabel} className="workbench-management-filter-chips" role="toolbar">
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            aria-pressed={selected}
            className={cx('ui-filter-chip', selected && 'ui-filter-chip--selected')}
            type="button"
            onClick={() => onChange(option.value)}
          >
            <span className="ui-filter-chip__label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
