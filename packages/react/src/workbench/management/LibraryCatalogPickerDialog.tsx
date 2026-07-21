import './library-catalog-picker-dialog.css';
import { useMemo, useState, type ReactNode } from 'react';

import { FilterBar, FilterBarRow } from '../../layout/panel';
import { CatalogBrowseCard } from '../../primitives/catalog-browse-card/CatalogBrowseCard';
import { ClearableTextInput } from '../../primitives/clearable-text-input/ClearableTextInput';
import { EmptyState } from '../../primitives/empty-state/EmptyState';
import { ScrollArea } from '../../primitives/scroll-area/ScrollArea';
import {
  WorkbenchDialogFrame,
  type WorkbenchDialogBodyLayout,
  type WorkbenchDialogFrameSize,
} from './WorkbenchDialogFrame';

/**
 * Product-neutral catalog row for the default cover-grid renderer.
 * Hosts with custom media should pass `renderItemMedia`.
 */
export interface LibraryCatalogPickerItem {
  readonly id: string;
  readonly imageAlt?: string | undefined;
  readonly imageUrl?: string | null | undefined;
  readonly label: string;
  readonly meta?: string | null | undefined;
}

export interface LibraryCatalogPickerDialogLabels {
  readonly clearSearch: string;
  readonly empty: string;
  readonly loading: string;
  readonly noMatches: string;
  readonly searchAria: string;
  readonly searchPlaceholder: string;
}

export interface LibraryCatalogPickerDialogProps {
  readonly ariaLabel: string;
  readonly bodyLayout?: WorkbenchDialogBodyLayout;
  readonly closeLabel: string;
  readonly dataAttributes?: Record<string, string>;
  readonly frameSize?: WorkbenchDialogFrameSize;
  /** Host actions above the searchable grid (install, import, refresh, …). */
  readonly headerActions?: ReactNode;
  readonly isLoading?: boolean;
  readonly items: ReadonlyArray<LibraryCatalogPickerItem>;
  readonly labels: LibraryCatalogPickerDialogLabels;
  readonly maximizeLabel?: string;
  readonly onClose: () => void;
  /** Called when the user activates a card (primary pointer or double-click). */
  readonly onPick: (itemId: string) => void;
  /**
   * Optional media override for cover tiles. When omitted, cards use
   * `imageUrl` / label initial fallback via `CatalogBrowseCard`.
   */
  readonly renderItemMedia?: ((item: LibraryCatalogPickerItem) => ReactNode) | undefined;
  readonly restoreLabel?: string;
  readonly selectedItemId?: string | null;
  readonly surfaceDataAttributes?: Record<string, string>;
  readonly title: ReactNode;
}

function filterCatalogPickerItems(
  items: ReadonlyArray<LibraryCatalogPickerItem>,
  query: string,
): ReadonlyArray<LibraryCatalogPickerItem> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return items;
  }

  return items.filter((item) => {
    if (item.label.toLowerCase().includes(normalized)) {
      return true;
    }
    return (item.meta?.toLowerCase() ?? '').includes(normalized);
  });
}

/**
 * Management dialog shell for picking one catalog/asset item.
 * Host owns item loading, persistence, and domain actions in `headerActions`.
 */
export function LibraryCatalogPickerDialog({
  ariaLabel,
  bodyLayout = 'column-fill',
  closeLabel,
  dataAttributes,
  frameSize = 'asset-library',
  headerActions = null,
  isLoading = false,
  items,
  labels,
  maximizeLabel,
  onClose,
  onPick,
  renderItemMedia,
  restoreLabel,
  selectedItemId = null,
  surfaceDataAttributes,
  title,
}: LibraryCatalogPickerDialogProps): ReactNode {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredItems = useMemo(
    () => filterCatalogPickerItems(items, searchQuery),
    [items, searchQuery],
  );
  const hasQuery = searchQuery.trim().length > 0;

  const pickItem = (itemId: string): void => {
    onPick(itemId);
  };

  return (
    <WorkbenchDialogFrame
      ariaLabel={ariaLabel}
      bodyLayout={bodyLayout}
      closeLabel={closeLabel}
      dataAttributes={dataAttributes}
      frameSize={frameSize}
      maximizeLabel={maximizeLabel}
      onClose={onClose}
      restoreLabel={restoreLabel}
      surfaceDataAttributes={surfaceDataAttributes}
      title={title}
    >
      <div
        className="ui-library-catalog-picker-dialog"
        data-ui-library-catalog-picker-dialog="true"
      >
        {headerActions !== null && headerActions !== undefined ? (
          <div
            className="ui-library-catalog-picker-dialog__actions"
            data-ui-library-catalog-picker-actions="true"
          >
            {headerActions}
          </div>
        ) : null}
        {isLoading && items.length === 0 ? (
          <EmptyState compact icon="sync">
            {labels.loading}
          </EmptyState>
        ) : items.length === 0 ? (
          <EmptyState compact icon="files">
            {labels.empty}
          </EmptyState>
        ) : (
          <div className="ui-library-catalog-picker-dialog__body">
            <FilterBar>
              <FilterBarRow data-columns="search-action">
                <ClearableTextInput
                  aria-label={labels.searchAria}
                  clearLabel={labels.clearSearch}
                  controlWidth="full"
                  data-ui-library-catalog-picker-search="true"
                  placeholder={labels.searchPlaceholder}
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
              </FilterBarRow>
            </FilterBar>
            {filteredItems.length === 0 ? (
              <EmptyState compact data-ui-library-catalog-picker-no-matches="true" icon="search">
                {hasQuery ? labels.noMatches : labels.empty}
              </EmptyState>
            ) : (
              <ScrollArea className="ui-library-catalog-picker-dialog__scroll">
                <div
                  className="ui-library-catalog-picker-dialog__grid"
                  data-ui-library-catalog-picker-grid="true"
                  role="listbox"
                >
                  {filteredItems.map((item) => {
                    const customMedia = renderItemMedia?.(item);
                    return (
                      <CatalogBrowseCard
                        key={item.id}
                        className="ui-library-catalog-picker-dialog__card"
                        data-ui-library-catalog-picker-item={item.id}
                        imageAlt={item.imageAlt}
                        imageUrl={customMedia === undefined ? (item.imageUrl ?? null) : null}
                        label={item.label}
                        media={customMedia}
                        meta={item.meta}
                        selected={selectedItemId === item.id}
                        tooltip={item.label}
                        type="button"
                        variant="cover"
                        onDoubleClick={() => {
                          pickItem(item.id);
                        }}
                        onPointerDown={(event) => {
                          if (event.button !== 0) {
                            return;
                          }
                          pickItem(item.id);
                        }}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </WorkbenchDialogFrame>
  );
}
