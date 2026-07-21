import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import {
  CatalogBrowsePane,
  type CatalogBrowseItem,
  type CatalogBrowseViewMode,
} from './CatalogBrowsePane';
import { filterCatalogBrowseItems } from './filterCatalogBrowseItems';

const sampleItems: CatalogBrowseItem[] = [
  {
    id: 'orbit-runner',
    label: 'Orbit Runner',
    meta: 'Action · 2024',
    description: 'Fast lane arcade racer.',
  },
  {
    id: 'harbor-tactics',
    label: 'Harbor Tactics',
    meta: 'Strategy · 2023',
    description: 'Coastal turn-based planning.',
  },
  {
    id: 'night-circuit',
    label: 'Night Circuit',
    meta: 'Racing · 2025',
    description: 'Neon street circuits.',
  },
];

function CatalogBrowseStory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [viewMode, setViewMode] = useState<CatalogBrowseViewMode>('grid');
  const [selectedItemId, setSelectedItemId] = useState<string | null>('orbit-runner');

  const filteredItems = filterCatalogBrowseItems(sampleItems, searchQuery);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 520, minWidth: 0 }}>
      <CatalogBrowsePane
        clearSearchLabel="Clear search"
        emptyMessage="No catalog items match the current filters."
        gridLabel="Grid"
        hasMore={false}
        isLoading={false}
        isLoadingMore={false}
        items={filteredItems}
        listLabel="List"
        loadingMessage="Loading catalog…"
        onLoadMore={() => undefined}
        onOpenItem={setSelectedItemId}
        onSearchQueryChange={setSearchQuery}
        onSortChange={setSort}
        onViewModeChange={setViewMode}
        searchAriaLabel="Catalog search"
        searchPlaceholder="Search catalog"
        searchQuery={searchQuery}
        selectedItemId={selectedItemId}
        sort={sort}
        sortAriaLabel="Sort catalog"
        sortOptions={[
          { label: 'Name', value: 'name' },
          { label: 'Recent', value: 'recent' },
        ]}
        viewMode={viewMode}
      />
    </div>
  );
}

const meta = {
  title: 'Primitives/CatalogBrowsePane',
  component: CatalogBrowseStory,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof CatalogBrowseStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grid: Story = {};

export const Empty: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: 420, minWidth: 0 }}>
      <CatalogBrowsePane
        clearSearchLabel="Clear search"
        emptyMessage="No catalog items match the current filters."
        gridLabel="Grid"
        hasMore={false}
        isLoading={false}
        isLoadingMore={false}
        items={[]}
        listLabel="List"
        loadingMessage="Loading catalog…"
        onLoadMore={() => undefined}
        onOpenItem={() => undefined}
        onSearchQueryChange={() => undefined}
        onSortChange={() => undefined}
        onViewModeChange={() => undefined}
        searchAriaLabel="Catalog search"
        searchPlaceholder="Search catalog"
        searchQuery="zzzz"
        selectedItemId={null}
        sort="name"
        sortAriaLabel="Sort catalog"
        sortOptions={[{ label: 'Name', value: 'name' }]}
        viewMode="grid"
      />
    </div>
  ),
};
