import type { ReactNode } from 'react';
import { FilterBar, FilterBarRow } from '../../layout/Panel';
import { ClearableTextInput } from '../../primitives/ClearableTextInput';
import { cx } from '../../utils/cx';
import { ManagementPanelSummary } from './ManagementPanelFrame.js';

export interface ManagementPanelControlsProps {
  filterLabel: string;
  filterPlaceholder: string;
  filters?: ReactNode;
  query: string;
  summary: ReactNode;
  className?: string | undefined;
  onQueryChange?: ((query: string) => void) | undefined;
}

export function ManagementPanelControls({
  className,
  filterLabel,
  filterPlaceholder,
  filters,
  query,
  summary,
  onQueryChange,
}: ManagementPanelControlsProps) {
  return (
    <FilterBar className={cx('workbench-management-controls', className)}>
      <ClearableTextInput
        aria-label={filterLabel}
        className="workbench-management-search"
        clearLabel="Clear filter"
        placeholder={filterPlaceholder}
        value={query}
        onClear={() => onQueryChange?.('')}
        onValueChange={(value) => onQueryChange?.(value)}
      />
      <FilterBarRow className="workbench-management-controls__meta">
        <ManagementPanelSummary>{summary}</ManagementPanelSummary>
        {filters}
      </FilterBarRow>
    </FilterBar>
  );
}
