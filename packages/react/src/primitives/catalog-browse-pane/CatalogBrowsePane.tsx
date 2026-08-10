import './catalog-browse-pane.css';
import {
  Fragment,
  useRef,
  type ComponentPropsWithRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import { cx } from '../../utils/cx';
import { ClearableTextInput } from '../clearable-text-input/ClearableTextInput';
import { CatalogBrowseCard } from '../catalog-browse-card/CatalogBrowseCard';
import { EmptyState } from '../empty-state/EmptyState';
import { IconButton } from '../icon-button/IconButton';
import { List, ListEmptyState, ListItem } from '../list/List';
import { ScrollArea } from '../scroll-area/ScrollArea';
import { ScrollAreaInfiniteSentinel } from '../scroll-area-infinite-load/ScrollAreaInfiniteSentinel';
import { useScrollAreaInfiniteLoad } from '../scroll-area-infinite-load/useScrollAreaInfiniteLoad';
import { Select } from '../select';
import { WorkbenchThumbnail } from '../workbench-thumbnail/WorkbenchThumbnail';
import { SegmentedControl } from '../workbench-editor/WorkbenchEditor';
import { FilterBar, FilterBarRow } from '../../layout/panel';

/**
 * Catalog browse frame (search / sort / grid|list / infinite scroll).
 * Product-neutral — hosts own domain labels and item render overrides.
 */
export type CatalogBrowseViewMode = 'grid' | 'list';

/**
 * Catalog row for the default grid/list renderers.
 * Hosts with richer cards should pass `renderGridItem` / `renderListItem`.
 */
export interface CatalogBrowseItem {
  readonly description?: string | null;
  readonly id: string;
  readonly imageAlt?: string;
  readonly imageUrl?: string | null;
  readonly label: string;
  readonly meta?: string | null;
}

export interface CatalogBrowseItemRenderState {
  readonly selected: boolean;
}

export interface CatalogBrowsePaneProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  readonly clearSearchLabel: string;
  readonly emptyMessage: string;
  readonly errorMessage?: string | null;
  /** Slot between search and sort/view controls (facet trigger, chips, etc.). */
  readonly facetStrip?: ReactNode;
  readonly gridAriaLabel?: string;
  /** Visual label for the grid view-mode segment (string or icon node). */
  readonly gridLabel?: ReactNode;
  readonly hasMore: boolean;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly items: ReadonlyArray<CatalogBrowseItem>;
  readonly listAriaLabel?: string;
  /** Visual label for the list view-mode segment (string or icon node). */
  readonly listLabel?: ReactNode;
  readonly loadingMessage: string;
  readonly onItemContextMenu?:
    ((itemId: string, itemLabel: string, event: ReactMouseEvent<HTMLElement>) => void) | undefined;
  readonly onLoadMore: () => void;
  readonly onOpenItem: (itemId: string) => void;
  readonly onRefresh?: (() => void) | null;
  readonly onSearchQueryChange: (query: string) => void;
  readonly onSortChange?: (sort: string) => void;
  readonly onViewModeChange: (viewMode: CatalogBrowseViewMode) => void;
  readonly refreshLabel?: string | null;
  readonly renderGridItem?:
    ((item: CatalogBrowseItem, state: CatalogBrowseItemRenderState) => ReactNode) | undefined;
  readonly renderListItem?:
    ((item: CatalogBrowseItem, state: CatalogBrowseItemRenderState) => ReactNode) | undefined;
  readonly searchAriaLabel: string;
  readonly searchPlaceholder: string;
  readonly searchQuery: string;
  readonly selectedItemId?: string | null;
  readonly sort?: string;
  readonly sortAriaLabel?: string;
  readonly sortOptions?: ReadonlyArray<{ label: string; value: string }>;
  /** Extra trailing controls after built-in sort / view mode (before refresh). */
  readonly toolbarTrailing?: ReactNode;
  readonly viewMode: CatalogBrowseViewMode;
  readonly viewModeAriaLabel?: string;
}

export function CatalogBrowsePane({
  className,
  clearSearchLabel,
  emptyMessage,
  errorMessage = null,
  facetStrip = null,
  gridAriaLabel,
  gridLabel = 'Grid',
  hasMore,
  isLoading,
  isLoadingMore,
  items,
  listAriaLabel,
  listLabel = 'List',
  loadingMessage,
  onItemContextMenu,
  onLoadMore,
  onOpenItem,
  onRefresh = null,
  onSearchQueryChange,
  onSortChange,
  onViewModeChange,
  refreshLabel = 'Refresh',
  renderGridItem,
  renderListItem,
  searchAriaLabel,
  searchPlaceholder,
  searchQuery,
  selectedItemId = null,
  sort,
  sortAriaLabel = 'Sort',
  sortOptions,
  toolbarTrailing = null,
  viewMode,
  viewModeAriaLabel = 'Catalog view mode',
  ...props
}: CatalogBrowsePaneProps): ReactNode {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { sentinelRef } = useScrollAreaInfiniteLoad({
    hasMore,
    isLoading,
    isLoadingMore,
    onLoadMore,
    scrollAreaRef,
  });

  const showInitialLoading = isLoading && items.length === 0;
  const showEmptyResults = !isLoading && !errorMessage && items.length === 0;
  const resolvedSortOptions = sortOptions ?? [];
  const hasSort =
    resolvedSortOptions.length > 0 && typeof onSortChange === 'function' && sort !== undefined;

  return (
    <div
      className={cx('ui-workbench-column', 'ui-catalog-browse', className)}
      data-ui-catalog-browse="true"
      {...props}
    >
      <FilterBar>
        <FilterBarRow
          className="ui-catalog-browse__toolbar"
          data-columns={facetStrip ? undefined : 'search-action'}
          data-ui-catalog-browse-has-sort={hasSort ? 'true' : undefined}
          data-ui-catalog-browse-toolbar="true"
          data-ui-catalog-browse-toolbar-filter={facetStrip ? 'true' : undefined}
        >
          <div className="ui-catalog-browse__search" data-ui-catalog-browse-search="true">
            <ClearableTextInput
              aria-label={searchAriaLabel}
              clearLabel={clearSearchLabel}
              controlWidth="full"
              onValueChange={onSearchQueryChange}
              placeholder={searchPlaceholder}
              value={searchQuery}
            />
          </div>
          {facetStrip}
          {hasSort ? (
            <div className="ui-catalog-browse__sort" data-ui-catalog-browse-sort="true">
              <Select
                aria-label={sortAriaLabel}
                controlWidth="full"
                onValueChange={onSortChange}
                value={sort}
              >
                {resolvedSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <SegmentedControl
            ariaLabel={viewModeAriaLabel}
            compact
            onChange={onViewModeChange}
            options={[
              {
                ariaLabel: typeof gridLabel === 'string' ? undefined : (gridAriaLabel ?? 'Grid'),
                label: gridLabel,
                value: 'grid',
              },
              {
                ariaLabel: typeof listLabel === 'string' ? undefined : (listAriaLabel ?? 'List'),
                label: listLabel,
                value: 'list',
              },
            ]}
            value={viewMode}
          />
          {toolbarTrailing}
          {onRefresh ? (
            <IconButton
              data-ui-catalog-browse-refresh="true"
              disabled={isLoading}
              icon="codicon-refresh"
              label={refreshLabel ?? 'Refresh'}
              onClick={onRefresh}
            />
          ) : null}
        </FilterBarRow>
      </FilterBar>

      {errorMessage ? (
        <ListEmptyState data-ui-catalog-browse-error="true" tone="error">
          {errorMessage}
        </ListEmptyState>
      ) : null}
      {showInitialLoading ? (
        <EmptyState compact data-ui-catalog-browse-loading="true" icon="loading">
          {loadingMessage}
        </EmptyState>
      ) : null}
      {showEmptyResults ? (
        <EmptyState compact data-ui-catalog-browse-empty="true" icon="library">
          {emptyMessage}
        </EmptyState>
      ) : null}

      {items.length > 0 && viewMode === 'grid' ? (
        <ScrollArea
          aria-label={gridAriaLabel ?? (typeof gridLabel === 'string' ? gridLabel : 'Grid')}
          className={cx('ui-workbench-panel-scroll', 'ui-catalog-browse__grid')}
          data-ui-catalog-browse-grid="true"
          gutter="auto"
          orientation="vertical"
          ref={scrollAreaRef}
          role="list"
        >
          {items.map((item) => {
            const selected = selectedItemId === item.id;
            return (
              <CatalogBrowseItemWrapper itemId={item.id} key={item.id}>
                {renderGridItem ? (
                  renderGridItem(item, { selected })
                ) : (
                  <CatalogBrowseCard
                    data-ui-catalog-browse-item={item.id}
                    imageAlt={item.imageAlt ?? item.label}
                    imageUrl={item.imageUrl ?? null}
                    label={item.label}
                    meta={item.meta ?? undefined}
                    onClick={() => onOpenItem(item.id)}
                    onContextMenu={(event) => {
                      onItemContextMenu?.(item.id, item.label, event);
                    }}
                    selected={selected}
                    tooltip={item.label}
                    variant="cover"
                  />
                )}
              </CatalogBrowseItemWrapper>
            );
          })}
          <BrowseScrollFooter
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            loadingMessage={loadingMessage}
            sentinelRef={sentinelRef}
          />
        </ScrollArea>
      ) : null}

      {items.length > 0 && viewMode === 'list' ? (
        <ScrollArea
          aria-label={listAriaLabel ?? (typeof listLabel === 'string' ? listLabel : 'List')}
          className={cx('ui-workbench-panel-scroll', 'ui-catalog-browse__list')}
          data-ui-catalog-browse-list="true"
          gutter="auto"
          orientation="vertical"
          ref={scrollAreaRef}
        >
          <List>
            {items.map((item) => {
              const selected = selectedItemId === item.id;
              if (renderListItem) {
                return <Fragment key={item.id}>{renderListItem(item, { selected })}</Fragment>;
              }

              return (
                <ListItem
                  className="ui-list-item--media"
                  data-ui-catalog-browse-item={item.id}
                  description={item.description ?? undefined}
                  key={item.id}
                  label={item.label}
                  leading={
                    <WorkbenchThumbnail
                      alt={item.imageAlt ?? item.label}
                      data-size="library"
                      fallbackIcon="library"
                      imageUrl={item.imageUrl ?? null}
                      size="library"
                    />
                  }
                  meta={item.meta ?? undefined}
                  onClick={() => onOpenItem(item.id)}
                  onContextMenu={(event) => {
                    onItemContextMenu?.(item.id, item.label, event);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenItem(item.id);
                    }
                  }}
                  selected={selected}
                />
              );
            })}
          </List>
          <BrowseScrollFooter
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            loadingMessage={loadingMessage}
            sentinelRef={sentinelRef}
          />
        </ScrollArea>
      ) : null}
    </div>
  );
}

function CatalogBrowseItemWrapper({
  children,
  itemId,
}: {
  readonly children: ReactNode;
  readonly itemId: string;
}): ReactNode {
  return (
    <div
      className="ui-catalog-browse__item"
      data-ui-catalog-browse-item-container={itemId}
      role="listitem"
    >
      {children}
    </div>
  );
}

function BrowseScrollFooter({
  hasMore,
  isLoadingMore,
  loadingMessage,
  sentinelRef,
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
  loadingMessage: string;
  sentinelRef: RefObject<HTMLDivElement | null>;
}): ReactNode {
  if (!hasMore && !isLoadingMore) {
    return null;
  }

  return (
    <>
      {hasMore ? (
        <ScrollAreaInfiniteSentinel data-ui-catalog-browse-sentinel="true" ref={sentinelRef} />
      ) : null}
      {isLoadingMore ? (
        <EmptyState compact data-ui-catalog-browse-loading-more="true" icon="loading">
          {loadingMessage}
        </EmptyState>
      ) : null}
    </>
  );
}
