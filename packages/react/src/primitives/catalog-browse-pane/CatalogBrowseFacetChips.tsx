import './catalog-browse-facet-chips.css';
import type { ReactNode } from 'react';

import { cx } from '../../utils/cx';
import { Chip } from '../chip/Chip';

export interface CatalogBrowseFacetOption {
  readonly id: string;
  readonly label: string;
}

export interface CatalogBrowseFacetChipsProps {
  readonly allLabel: string;
  readonly ariaLabel: string;
  readonly className?: string;
  readonly onChange: (value: string | 'all') => void;
  readonly options: ReadonlyArray<CatalogBrowseFacetOption>;
  readonly value: string | 'all';
}

/**
 * Simple single-select chip facet for `CatalogBrowsePane.facetStrip`.
 * Prefer `LibraryFacetFilterStrip` for multi-field catalog facets.
 */
export function CatalogBrowseFacetChips({
  allLabel,
  ariaLabel,
  className,
  onChange,
  options,
  value,
}: CatalogBrowseFacetChipsProps): ReactNode {
  return (
    <div
      aria-label={ariaLabel}
      className={cx('ui-catalog-browse-facet-chips', className)}
      role="toolbar"
    >
      <Chip
        aria-pressed={value === 'all'}
        className={value === 'all' ? 'ui-chip--selected' : undefined}
        label={allLabel}
        onClick={() => onChange('all')}
      />
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Chip
            aria-pressed={active}
            className={active ? 'ui-chip--selected' : undefined}
            key={option.id}
            label={option.label}
            onClick={() => onChange(option.id)}
          />
        );
      })}
    </div>
  );
}
