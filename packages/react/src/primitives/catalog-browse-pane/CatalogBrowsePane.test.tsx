/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CatalogBrowsePane,
  type CatalogBrowsePaneProps,
  type CatalogBrowseViewMode,
} from './CatalogBrowsePane';

function renderPane(
  viewMode: CatalogBrowseViewMode,
  renderItem?: (label: string) => ReactNode,
): HTMLDivElement {
  const renderOverrides: Partial<CatalogBrowsePaneProps> = renderItem
    ? viewMode === 'grid'
      ? { renderGridItem: (item) => renderItem(item.label) }
      : { renderListItem: (item) => renderItem(item.label) }
    : {};
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    <CatalogBrowsePane
      clearSearchLabel="Clear search"
      emptyMessage="No items"
      hasMore={false}
      isLoading={false}
      isLoadingMore={false}
      items={[{ id: 'item-a', label: 'Item A' }]}
      loadingMessage="Loading"
      onLoadMore={() => undefined}
      onOpenItem={() => undefined}
      onSearchQueryChange={() => undefined}
      onViewModeChange={() => undefined}
      searchAriaLabel="Search"
      searchPlaceholder="Search catalog"
      searchQuery=""
      viewMode={viewMode}
      {...renderOverrides}
    />,
  );
  return container;
}

function directListItems(list: Element): Element[] {
  return Array.from(list.children).filter((child) => child.getAttribute('role') === 'listitem');
}

describe('CatalogBrowsePane', () => {
  it('gives sort its own layout wrapper and fills it with the Select', () => {
    const markup = renderToStaticMarkup(
      <CatalogBrowsePane
        clearSearchLabel="Clear search"
        emptyMessage="No items"
        hasMore={false}
        isLoading={false}
        isLoadingMore={false}
        items={[]}
        loadingMessage="Loading"
        onLoadMore={() => undefined}
        onOpenItem={() => undefined}
        onSearchQueryChange={() => undefined}
        onSortChange={() => undefined}
        onViewModeChange={() => undefined}
        searchAriaLabel="Search"
        searchPlaceholder="Search catalog"
        searchQuery=""
        sort="title"
        sortOptions={[{ label: 'Title: A–Z', value: 'title' }]}
        viewMode="grid"
      />,
    );

    expect(markup).toContain(
      'class="ui-catalog-browse__search" data-ui-catalog-browse-search="true"',
    );
    expect(markup).toContain('class="ui-catalog-browse__sort" data-ui-catalog-browse-sort="true"');
    expect(markup).toContain('class="ui-select" data-width="full"');
    expect(markup).not.toContain('data-width="wide"');
  });

  it('wraps default grid items without replacing their button semantics', () => {
    const container = renderPane('grid');
    const list = container.querySelector('[data-ui-catalog-browse-grid="true"]');

    expect(list?.getAttribute('role')).toBe('list');
    const items = directListItems(list!);
    expect(items).toHaveLength(1);
    const button = items[0]?.querySelector(':scope > button.ui-catalog-browse-card');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('role')).toBeNull();
  });

  it('wraps custom grid items while preserving native button semantics', () => {
    const container = renderPane('grid', (label) => (
      <button data-custom-item="true" type="button">
        {label}
      </button>
    ));
    const list = container.querySelector('[data-ui-catalog-browse-grid="true"]');

    const items = directListItems(list!);
    expect(items).toHaveLength(1);
    const button = items[0]?.querySelector(':scope > button[data-custom-item="true"]');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('role')).toBeNull();
  });

  it('preserves the listbox and option contract for list view', () => {
    const container = renderPane('list');
    const listbox = container.querySelector('.ui-list');

    expect(listbox?.getAttribute('role')).toBe('listbox');
    expect(listbox?.children).toHaveLength(1);
    expect(listbox?.firstElementChild?.getAttribute('role')).toBe('option');
    expect(listbox?.querySelector('[role="listitem"]')).toBeNull();
  });
});
