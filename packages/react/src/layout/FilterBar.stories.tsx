import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { EmptyState } from '../primitives/EmptyState';
import { IconButton } from '../primitives/IconButton';
import { List, ListEmptyState, ListItem } from '../primitives/List';
import { Select } from '../primitives/Select';
import { TextInput } from '../primitives/TextInput';
import { Toolbar } from '../primitives/Toolbar';
import {
  FilterBar,
  FilterBarActiveChips,
  FilterBarRow,
  FilterChip,
  Panel,
  PanelBody,
  PanelHeader,
} from './Panel';

const meta = {
  title: 'React/Layout/FilterBar',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type CatalogItem = {
  id: string;
  installed: boolean;
  platform: string;
  source: string;
  title: string;
};

const catalogItems: CatalogItem[] = [
  { id: 'portal', installed: true, platform: 'Windows', source: 'Steam', title: 'Portal 2' },
  { id: 'hades', installed: true, platform: 'Windows', source: 'Epic', title: 'Hades' },
  { id: 'factorio', installed: false, platform: 'Windows', source: 'Steam', title: 'Factorio' },
  { id: 'celeste', installed: true, platform: 'Windows', source: 'Local', title: 'Celeste' },
  { id: 'outer', installed: false, platform: 'Windows', source: 'Epic', title: 'Outer Wilds' },
];

type ActiveFilter = {
  id: string;
  label: string;
};

function buildActiveFilters({
  installedOnly,
  platform,
  source,
}: {
  installedOnly: boolean;
  platform: string;
  source: string;
}): ActiveFilter[] {
  const next: ActiveFilter[] = [];
  if (installedOnly) next.push({ id: 'installed', label: 'Installed' });
  if (source !== 'all') next.push({ id: 'source', label: `Source: ${source}` });
  if (platform !== 'all') next.push({ id: 'platform', label: `Platform: ${platform}` });
  return next;
}

function LibraryFilterHarness() {
  const [searchText, setSearchText] = useState('');
  const [installedOnly, setInstalledOnly] = useState(false);
  const [source, setSource] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const activeFilters = useMemo(
    () => buildActiveFilters({ installedOnly, platform, source }),
    [installedOnly, platform, source],
  );

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return catalogItems.filter((item) => {
      if (installedOnly && !item.installed) return false;
      if (source !== 'all' && item.source !== source) return false;
      if (platform !== 'all' && item.platform !== platform) return false;
      if (!query) return true;
      return item.title.toLowerCase().includes(query) || item.id.includes(query);
    });
  }, [installedOnly, platform, searchText, source]);

  const clearAllFilters = () => {
    setInstalledOnly(false);
    setSource('all');
    setPlatform('all');
    setSearchText('');
  };

  const dismissFilter = (filterId: string) => {
    if (filterId === 'installed') setInstalledOnly(false);
    if (filterId === 'source') setSource('all');
    if (filterId === 'platform') setPlatform('all');
  };

  return (
    <div style={{ width: 640, height: 560, background: 'var(--color-bg)' }}>
      <Panel>
        <PanelHeader
          actions={
            <Toolbar>
              <Badge variant="muted">{filteredItems.length} items</Badge>
              <IconButton
                icon={viewMode === 'list' ? 'codicon-list-flat' : 'codicon-grid'}
                label={viewMode === 'list' ? 'Switch to grid' : 'Switch to list'}
                onClick={() => setViewMode((current) => (current === 'list' ? 'grid' : 'list'))}
              />
            </Toolbar>
          }
        >
          Library catalog
        </PanelHeader>
        <FilterBar aria-label="Library filters">
          <FilterBarRow data-columns="search-action">
            <TextInput
              aria-label="Search library"
              controlWidth="full"
              placeholder="Search title or id"
              value={searchText}
              onChange={(event) => setSearchText(event.currentTarget.value)}
            />
            <Button variant="primary" onClick={() => setInstalledOnly((current) => !current)}>
              {installedOnly ? 'All items' : 'Installed only'}
            </Button>
          </FilterBarRow>
          <FilterBarRow>
            <Select
              aria-label="Source filter"
              controlWidth="full"
              value={source}
              onChange={(event) => setSource(event.currentTarget.value)}
            >
              <option value="all">All sources</option>
              <option value="Steam">Steam</option>
              <option value="Epic">Epic</option>
              <option value="Local">Local</option>
            </Select>
            <Select
              aria-label="Platform filter"
              controlWidth="full"
              value={platform}
              onChange={(event) => setPlatform(event.currentTarget.value)}
            >
              <option value="all">All platforms</option>
              <option value="Windows">Windows</option>
            </Select>
          </FilterBarRow>
          {activeFilters.length > 0 ? (
            <FilterBarActiveChips onClearAll={clearAllFilters}>
              {activeFilters.map((filter) => (
                <FilterChip
                  key={filter.id}
                  aria-label={`Remove ${filter.label} filter`}
                  count={filteredItems.length}
                  label={filter.label}
                  onDismiss={() => dismissFilter(filter.id)}
                />
              ))}
            </FilterBarActiveChips>
          ) : null}
        </FilterBar>
        <PanelBody style={{ padding: 0 }}>
          {filteredItems.length === 0 ? (
            <EmptyState icon="codicon-search" title="No matching items">
              Adjust filters or clear the active filter bar.
            </EmptyState>
          ) : (
            <List ariaLabel="Library results">
              {filteredItems.map((item) => (
                <ListItem
                  key={item.id}
                  description={`${item.source} · ${item.platform}`}
                  icon="codicon-package"
                  label={item.title}
                  meta={item.installed ? <Badge variant="accent">Installed</Badge> : null}
                />
              ))}
            </List>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}

export const ActiveFilterBar: Story = {
  render: () => <LibraryFilterHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.selectOptions(canvas.getByLabelText('Source filter'), 'Steam');
    await expect(canvas.getByRole('button', { name: /Remove Source: Steam filter/ })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Clear all' }));
    await expect(canvas.queryByRole('button', { name: /Remove Source/ })).toBeNull();
    await expect(canvas.getByText('Portal 2')).toBeVisible();
  },
};

export const EmptyFilterResult: Story = {
  render: () => {
    const [query, setQuery] = useState('missing-title');

    return (
      <div style={{ width: 420, background: 'var(--color-bg)' }}>
        <FilterBar aria-label="Empty filter demo">
          <FilterBarRow data-columns="search-action">
            <TextInput
              aria-label="Search"
              controlWidth="full"
              placeholder="Search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </FilterBarRow>
          <FilterBarActiveChips onClearAll={() => setQuery('')}>
            <FilterChip label={`Query: ${query}`} onDismiss={() => setQuery('')} />
          </FilterBarActiveChips>
        </FilterBar>
        <ListEmptyState tone="error">No commands match the current filter.</ListEmptyState>
      </div>
    );
  },
};
