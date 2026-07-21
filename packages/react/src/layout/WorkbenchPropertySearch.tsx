import type { ComponentPropsWithoutRef } from 'react';

import { FilterBar, FilterBarRow } from './panel';
import { ClearableTextInput } from '../primitives/clearable-text-input';
import { cx } from '../utils/cx';

export interface WorkbenchPropertySearchProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange'
> {
  /** Accessible name for the search input. Defaults to "Search properties". */
  'aria-label'?: string;
  clearLabel?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

/**
 * Declared-first inspector search chrome.
 * Pair with `filterWorkbenchPropertyFields` — hosts own the field manifest.
 */
export function WorkbenchPropertySearch({
  'aria-label': ariaLabel = 'Search properties',
  className,
  clearLabel = 'Clear',
  onValueChange,
  placeholder = 'Search properties',
  value,
  ...props
}: WorkbenchPropertySearchProps) {
  return (
    <FilterBar
      className={cx('ui-workbench-property-search', className)}
      data-ui-workbench-property-search-bar="true"
      {...props}
    >
      <FilterBarRow data-columns="search">
        <ClearableTextInput
          aria-label={ariaLabel}
          clearLabel={clearLabel}
          controlWidth="full"
          data-ui-workbench-property-search="true"
          placeholder={placeholder}
          value={value}
          onValueChange={onValueChange}
        />
      </FilterBarRow>
    </FilterBar>
  );
}
