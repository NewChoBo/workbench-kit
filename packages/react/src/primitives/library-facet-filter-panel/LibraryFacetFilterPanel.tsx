import './library-facet-filter-panel.css';
import { useId, useState, type ReactNode } from 'react';

import { FilterBar, FilterBarActiveChips } from '../../layout/panel';
import { cx } from '../../utils/cx';
import { cxCodicon } from '../../utils/codicon';
import { Checkbox } from '../checkbox/Checkbox';
import { Chip } from '../chip';
import { EmptyState } from '../empty-state/EmptyState';
import {
  type LibraryFacetActiveChip,
  type LibraryFacetField,
  type LibraryFacetFieldKind,
  type LibraryFacetFieldPresentation,
} from '../library-facet-filter-strip/LibraryFacetFilterStrip';
import { ScrollArea } from '../scroll-area/ScrollArea';
import { SearchableMultiSelect } from '../searchable-multi-select/SearchableMultiSelect';

export type {
  LibraryFacetActiveChip,
  LibraryFacetField,
  LibraryFacetFieldKind,
  LibraryFacetFieldOption,
  LibraryFacetFieldPresentation,
} from '../library-facet-filter-strip/LibraryFacetFilterStrip';

/**
 * Multi-select fields with at least this many options default to searchable
 * chip + suggestion presentation (unless `presentation` is set explicitly).
 */
const SEARCHABLE_MULTI_THRESHOLD = 6;
/** Lay checklist options in multiple columns once a field has at least this many. */
const OPTION_MULTI_COLUMN_THRESHOLD = 6;

/** Host-ordered section of facet fields (product-neutral ids; labels via resolveSectionLabel). */
export interface LibraryFacetSection {
  /**
   * Uncontrolled initial collapsed state when `collapsibleSections` is true.
   * When omitted, sections start expanded.
   */
  readonly defaultCollapsed?: boolean;
  readonly fields: ReadonlyArray<LibraryFacetField>;
  readonly id: string;
}

export interface LibraryFacetFilterPanelLabels {
  readonly clearAll: string;
  readonly clearChipAria: (chipLabel: string) => string;
  readonly empty?: string;
  /** Aria/placeholder for searchable facet input. Default: "Search options". */
  readonly filterOptions?: string;
  /** Shown when option filter matches nothing. Default: "No matching options". */
  readonly noMatchingOptions?: string;
}

export interface LibraryFacetFilterPanelProps {
  readonly activeChips?: ReadonlyArray<LibraryFacetActiveChip>;
  readonly className?: string;
  /**
   * When true, section headers toggle collapse.
   * Default false — keeps all sections expanded.
   */
  readonly collapsibleSections?: boolean;
  readonly description?: string;
  readonly labels: LibraryFacetFilterPanelLabels;
  /** Required when `showActiveChips` is true (chip strip Clear). Host may own Clear otherwise. */
  readonly onClearAll?: (() => void);
  readonly onRemoveChip?: ((chipId: string) => void);
  readonly onToggleFacetValue: (
    fieldId: string,
    value: string,
    kind: LibraryFacetFieldKind,
  ) => void;
  readonly resolveFieldLabel: (fieldId: string) => string;
  readonly resolveSectionLabel?: ((sectionId: string) => string);
  readonly sections: ReadonlyArray<LibraryFacetSection>;
  readonly selectedValues: Readonly<Record<string, readonly string[]>>;
  /**
   * When false, omit the selected-value chip strip (checklist already shows
   * selection). Hosts should place Clear in their own header chrome.
   * Default true for backward compatibility.
   */
  readonly showActiveChips?: boolean;
}

function sectionHasSelection(
  section: LibraryFacetSection,
  selectedValues: Readonly<Record<string, readonly string[]>>,
): boolean {
  return section.fields.some((field) => (selectedValues[field.id]?.length ?? 0) > 0);
}

function countSectionSelections(
  section: LibraryFacetSection,
  selectedValues: Readonly<Record<string, readonly string[]>>,
): number {
  return section.fields.reduce((sum, field) => sum + (selectedValues[field.id]?.length ?? 0), 0);
}

function resolveDefaultCollapsed(
  section: LibraryFacetSection,
  selectedValues: Readonly<Record<string, readonly string[]>>,
): boolean {
  if (sectionHasSelection(section, selectedValues)) {
    return false;
  }
  return section.defaultCollapsed === true;
}

function resolveFieldPresentation(field: LibraryFacetField): LibraryFacetFieldPresentation {
  if (field.presentation) {
    return field.presentation;
  }
  if (field.kind === 'multi-select' && field.options.length >= SEARCHABLE_MULTI_THRESHOLD) {
    return 'searchable-multi';
  }
  return 'checklist';
}

function sectionUsesSearchable(section: LibraryFacetSection): boolean {
  return section.fields.some((field) => resolveFieldPresentation(field) === 'searchable-multi');
}

/**
 * Multi-section facet filter panel for modal / side surfaces.
 * Complements `LibraryFacetFilterStrip` cascade menus — same field/value I/O,
 * with optional chips and grouped option lists. Domain DTOs stay in the host.
 * High-cardinality multi-select fields use `SearchableMultiSelect`.
 */
export function LibraryFacetFilterPanel({
  activeChips = [],
  className,
  collapsibleSections = false,
  description,
  labels,
  onClearAll,
  onRemoveChip,
  onToggleFacetValue,
  resolveFieldLabel,
  resolveSectionLabel,
  sections,
  selectedValues,
  showActiveChips = true,
}: LibraryFacetFilterPanelProps): ReactNode {
  const visibleSections = sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => field.options.length > 0),
    }))
    .filter((section) => section.fields.length > 0);
  const hasChipStrip =
    showActiveChips && activeChips.length > 0 && typeof onClearAll === 'function';

  return (
    <div
      className={['ui-library-facet-filter-panel', className].filter(Boolean).join(' ')}
      data-ui-library-facet-filter-panel="true"
      data-ui-library-facet-filter-panel-chips={showActiveChips ? 'true' : 'false'}
      data-ui-library-facet-filter-panel-collapsible={collapsibleSections ? 'true' : 'false'}
    >
      {description ? (
        <p className="ui-library-facet-filter-panel__description">{description}</p>
      ) : null}
      {hasChipStrip ? (
        <FilterBar>
          <FilterBarActiveChips
            clearAllLabel={labels.clearAll}
            data-ui-library-facet-filter-panel-chips="true"
            onClearAll={onClearAll}
          >
            {activeChips.map((chip) => (
              <Chip
                key={chip.id}
                aria-label={labels.clearChipAria(chip.label)}
                data-ui-library-facet-filter-panel-chip={chip.id}
                label={chip.label}
                onDismiss={() => {
                  onRemoveChip?.(chip.id);
                }}
              />
            ))}
          </FilterBarActiveChips>
        </FilterBar>
      ) : null}
      {visibleSections.length === 0 ? (
        <EmptyState compact icon="filter">
          {labels.empty ?? 'No filters available'}
        </EmptyState>
      ) : (
        <ScrollArea
          className="ui-library-facet-filter-panel__scroll"
          gutter="auto"
          orientation="vertical"
          scrollbars="overlay"
        >
          <div
            className="ui-library-facet-filter-panel__sections"
            data-ui-library-facet-filter-panel-sections="true"
          >
            {visibleSections.map((section) => (
              <FacetSection
                key={section.id}
                collapsible={collapsibleSections}
                defaultCollapsed={resolveDefaultCollapsed(section, selectedValues)}
                labels={labels}
                onToggleFacetValue={onToggleFacetValue}
                resolveFieldLabel={resolveFieldLabel}
                section={section}
                sectionLabel={resolveSectionLabel?.(section.id) ?? section.id}
                selectedCount={countSectionSelections(section, selectedValues)}
                selectedValues={selectedValues}
                searchable={sectionUsesSearchable(section)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function FacetSection({
  collapsible,
  defaultCollapsed,
  labels,
  onToggleFacetValue,
  resolveFieldLabel,
  searchable,
  section,
  sectionLabel,
  selectedCount,
  selectedValues,
}: {
  collapsible: boolean;
  defaultCollapsed: boolean;
  labels: LibraryFacetFilterPanelLabels;
  onToggleFacetValue: LibraryFacetFilterPanelProps['onToggleFacetValue'];
  resolveFieldLabel: LibraryFacetFilterPanelProps['resolveFieldLabel'];
  searchable: boolean;
  section: LibraryFacetSection;
  sectionLabel: string;
  selectedCount: number;
  selectedValues: Readonly<Record<string, readonly string[]>>;
}): ReactNode {
  const baseId = useId();
  const contentId = `${baseId}-content`;
  const headingId = `${baseId}-heading`;
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section
      className={cx(
        'ui-library-facet-filter-panel__section',
        searchable && 'ui-library-facet-filter-panel__section--searchable',
        collapsible && 'ui-library-facet-filter-panel__section--collapsible',
        collapsible && collapsed && 'ui-library-facet-filter-panel__section--collapsed',
      )}
      data-ui-library-facet-filter-panel-section={section.id}
      data-collapsed={collapsible && collapsed ? 'true' : undefined}
      data-presentation={searchable ? 'searchable-multi' : 'checklist'}
    >
      {collapsible ? (
        <button
          aria-controls={contentId}
          aria-expanded={!collapsed}
          className="ui-library-facet-filter-panel__section-toggle"
          type="button"
          onClick={() => {
            setCollapsed((current) => !current);
          }}
        >
          <i
            aria-hidden="true"
            className={cxCodicon(
              collapsed ? 'chevron-right' : 'chevron-down',
              'ui-library-facet-filter-panel__section-chevron',
            )}
          />
          <span className="ui-library-facet-filter-panel__section-title" id={headingId}>
            {sectionLabel}
          </span>
          {selectedCount > 0 ? (
            <span className="ui-library-facet-filter-panel__section-count">{selectedCount}</span>
          ) : null}
        </button>
      ) : (
        <h3 className="ui-library-facet-filter-panel__section-title" id={headingId}>
          {sectionLabel}
        </h3>
      )}
      <div
        aria-labelledby={headingId}
        className="ui-library-facet-filter-panel__fields"
        hidden={collapsible ? collapsed : undefined}
        id={collapsible ? contentId : undefined}
      >
        {section.fields.map((field) => (
          <FacetFieldGroup
            key={field.id}
            clearChipAria={labels.clearChipAria}
            field={field}
            fieldLabel={resolveFieldLabel(field.id)}
            filterOptionsLabel={labels.filterOptions ?? 'Search options'}
            noMatchingOptionsLabel={labels.noMatchingOptions ?? 'No matching options'}
            onToggleFacetValue={onToggleFacetValue}
            selectedValues={selectedValues[field.id] ?? []}
          />
        ))}
      </div>
    </section>
  );
}

function FacetFieldGroup({
  clearChipAria,
  field,
  fieldLabel,
  filterOptionsLabel,
  noMatchingOptionsLabel,
  onToggleFacetValue,
  selectedValues,
}: {
  clearChipAria: (chipLabel: string) => string;
  field: LibraryFacetField;
  fieldLabel: string;
  filterOptionsLabel: string;
  noMatchingOptionsLabel: string;
  onToggleFacetValue: LibraryFacetFilterPanelProps['onToggleFacetValue'];
  selectedValues: readonly string[];
}): ReactNode {
  const presentation = resolveFieldPresentation(field);

  if (presentation === 'searchable-multi' && field.kind === 'multi-select') {
    return (
      <div
        className="ui-library-facet-filter-panel__field ui-library-facet-filter-panel__field--searchable"
        data-ui-library-facet-filter-panel-field={field.id}
        data-presentation="searchable-multi"
      >
        <div className="ui-library-facet-filter-panel__field-title">{fieldLabel}</div>
        <SearchableMultiSelect
          aria-label={fieldLabel}
          className="ui-library-facet-filter-panel__searchable"
          emptyMessage={noMatchingOptionsLabel}
          getRemoveChipAriaLabel={clearChipAria}
          options={field.options}
          searchPlaceholder={filterOptionsLabel}
          selectedValues={selectedValues}
          onValueToggle={(value) => {
            onToggleFacetValue(field.id, value, field.kind);
          }}
        />
      </div>
    );
  }

  return (
    <FacetChecklist
      field={field}
      fieldLabel={fieldLabel}
      onToggleFacetValue={onToggleFacetValue}
      selectedValues={selectedValues}
    />
  );
}

function FacetChecklist({
  field,
  fieldLabel,
  onToggleFacetValue,
  selectedValues,
}: {
  field: LibraryFacetField;
  fieldLabel: string;
  onToggleFacetValue: LibraryFacetFilterPanelProps['onToggleFacetValue'];
  selectedValues: readonly string[];
}): ReactNode {
  const multiColumn = field.options.length >= OPTION_MULTI_COLUMN_THRESHOLD;

  return (
    <div
      className="ui-library-facet-filter-panel__field"
      data-ui-library-facet-filter-panel-field={field.id}
      data-presentation="checklist"
    >
      <div className="ui-library-facet-filter-panel__field-title">{fieldLabel}</div>
      <div
        className={cx(
          'ui-library-facet-filter-panel__options',
          multiColumn && 'ui-library-facet-filter-panel__options--multi-column',
        )}
        role={field.kind === 'single-select' ? 'radiogroup' : 'group'}
        aria-label={fieldLabel}
      >
        {field.options.map((option) => {
          const selected = selectedValues.includes(option.value);
          const optionKey = `${field.id}:${option.value}`;

          if (field.kind === 'single-select') {
            return (
              <button
                key={optionKey}
                aria-checked={selected}
                className="ui-library-facet-filter-panel__option"
                data-ui-library-facet-filter-panel-option={optionKey}
                data-selected={selected ? 'true' : undefined}
                role="radio"
                type="button"
                onClick={() => {
                  onToggleFacetValue(field.id, option.value, field.kind);
                }}
              >
                <span className="ui-library-facet-filter-panel__option-label">{option.label}</span>
                {option.count !== undefined ? (
                  <span className="ui-library-facet-filter-panel__option-count">
                    {option.count}
                  </span>
                ) : null}
              </button>
            );
          }

          return (
            <div
              key={optionKey}
              className="ui-library-facet-filter-panel__option ui-library-facet-filter-panel__option--checkbox"
              data-ui-library-facet-filter-panel-option={optionKey}
              data-selected={selected ? 'true' : undefined}
            >
              <Checkbox
                checked={selected}
                label={
                  <span className="ui-library-facet-filter-panel__option-row">
                    <span className="ui-library-facet-filter-panel__option-label">
                      {option.label}
                    </span>
                    {option.count !== undefined ? (
                      <span className="ui-library-facet-filter-panel__option-count">
                        {option.count}
                      </span>
                    ) : null}
                  </span>
                }
                onCheckedChange={() => {
                  onToggleFacetValue(field.id, option.value, field.kind);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
