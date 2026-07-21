import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CatalogBrowsePane } from './CatalogBrowsePane';

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
});
