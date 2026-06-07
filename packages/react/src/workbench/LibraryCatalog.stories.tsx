import { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  LIBRARY_DRAG_DATA_TYPE,
  LIBRARY_DRAG_IDS_DATA_TYPE,
  createLibraryDragPayload,
  createLibraryItemIdentity,
  resolveLibraryItemProviderId,
  type LibraryCatalogSnapshot,
  type LibraryItemKind,
  type LibraryQuery,
  type LibrarySortMode,
} from '@workbench-kit/contracts';
import {
  createStaticLibraryManifestProvider,
  createLibraryManifestUrlProvider,
} from '@workbench-kit/adapters';
import { LibraryCatalogService } from '@workbench-kit/services';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { EmptyState } from '../primitives/EmptyState';
import { Select } from '../primitives/Select';
import { TextInput } from '../primitives/TextInput';
import { FilterBar, FilterBarActiveChips, FilterChip } from '../layout/Panel';
import {
  SideBarHeaderControl,
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
} from '../layout/SideBarViewFrame';
import type { StatusBarSectionModel } from './StatusBar';
import { WorkbenchShell } from './WorkbenchShell';

const meta = {
  title: 'React/Workbench/Catalog/LibraryCatalog',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const staticLibraryManifest = {
  id: 'core-library',
  name: 'Core Library',
  version: '1.0.0',
  schemaVersion: 1,
  source: {
    kind: 'embedded-json',
    ref: 'demo://core-manifest.json',
    displayName: 'Core Library Source',
  },
  items: [
    {
      id: 'calculator',
      kind: 'app',
      title: 'Calculator',
      description: 'Simple calculator for quick arithmetic.',
      tags: ['utility'],
      installed: true,
      source: {
        kind: 'json-file',
        ref: 'demo://core/calculator.json',
        displayName: 'Core App',
      },
    },
    {
      id: 'note-tile',
      kind: 'tile',
      title: 'Quick Note',
      description: 'Sticky note tile launcher.',
      tags: ['productivity'],
      source: {
        kind: 'json-file',
        ref: 'demo://core/quick-note.json',
        displayName: 'Core App',
      },
    },
    {
      id: 'sample-game',
      kind: 'game',
      title: 'Puzzle Room',
      description: 'Starter game tile for launch validation.',
      source: {
        kind: 'json-file',
        ref: 'demo://core/puzzle-room.json',
        displayName: 'Core App',
      },
    },
  ],
};

const remoteLibraryManifest = {
  id: 'remote-library',
  name: 'Remote Library',
  version: '1.1.0',
  schemaVersion: 1,
  source: {
    kind: 'json-url',
    ref: 'https://example.com/library-manifest.json',
    displayName: 'Remote Source',
  },
  items: [
    {
      id: 'url-launcher',
      kind: 'url',
      title: 'Weather Web',
      description: 'Open weather portal with one click.',
      tags: ['utility'],
      source: {
        kind: 'json-url',
        ref: 'https://example.com/weather.json',
        displayName: 'Remote Source',
      },
    },
    {
      id: 'command-helper',
      kind: 'command',
      title: 'Open Terminal',
      description: 'Launch terminal command in one action.',
      installed: true,
      tags: ['dev', 'tool'],
      source: {
        kind: 'json-url',
        ref: 'https://example.com/terminal-command.json',
        displayName: 'Remote Source',
      },
    },
  ],
};

const remoteLibraryManifestText = JSON.stringify(remoteLibraryManifest);

const libraryService = new LibraryCatalogService({
  providers: [
    createStaticLibraryManifestProvider({
      displayName: 'Core Apps',
      id: 'core',
      manifestText: JSON.stringify(staticLibraryManifest),
    }),
    createLibraryManifestUrlProvider({
      displayName: 'Remote Apps',
      id: 'remote',
      manifestUrl: 'https://cdn.example/library-manifest.json',
      readText: async () => remoteLibraryManifestText,
    }),
  ],
});

const allItemKinds = ['app', 'command', 'folder', 'game', 'other', 'tile', 'url'] as const;
const allProviderOption = 'all-providers';

const itemKindLabel: Record<LibraryItemKind, string> = {
  app: 'App',
  command: 'Command',
  folder: 'Folder',
  game: 'Game',
  other: 'Other',
  tile: 'Tile',
  url: 'URL',
};

function buildQuery({
  installedOnly,
  kindFilter,
  providerFilter,
  q,
  sortBy,
}: {
  installedOnly: boolean;
  kindFilter: 'all' | LibraryItemKind;
  providerFilter: string;
  q: string;
  sortBy: LibrarySortMode;
}): LibraryQuery {
  const nextQuery: LibraryQuery = {
    q: q.trim() || undefined,
    sortBy,
  };

  if (installedOnly) {
    nextQuery.installed = true;
  }

  if (kindFilter !== 'all') {
    nextQuery.kinds = [kindFilter];
  }

  if (providerFilter !== allProviderOption) {
    nextQuery.providerIds = [providerFilter];
  }

  return nextQuery;
}

export const CatalogActivity: Story = {
  render: () => <LibraryCatalogStory />,
};

function LibraryCatalogStory() {
  const [installedOnly, setInstalledOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [providerFilter, setProviderFilter] = useState(allProviderOption);
  const [kindFilter, setKindFilter] = useState<'all' | LibraryItemKind>('all');
  const [sortBy, setSortBy] = useState<LibrarySortMode>('provider');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<LibraryCatalogSnapshot | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const query = useMemo(
    () =>
      buildQuery({
        installedOnly,
        kindFilter,
        providerFilter,
        q: searchText,
        sortBy,
      }),
    [installedOnly, kindFilter, providerFilter, searchText, sortBy],
  );

  const refreshCatalog = (refresh = false) => {
    setLoading(true);
    libraryService
      .listCatalog({ query, refresh })
      .then((next) => {
        setSnapshot(next);
        setError('');
        setLoading(false);

        setSelectedKey((currentSelectedKey) =>
          currentSelectedKey &&
          next.items.some((item) => createLibraryItemIdentity(item) === currentSelectedKey)
            ? currentSelectedKey
            : next.items.length > 0
              ? createLibraryItemIdentity(next.items[0])
              : null,
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Library query failed');
        setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const next = await libraryService.listCatalog({ query });
        if (cancelled) return;

        setSnapshot(next);
        setError('');
        setLoading(false);

        setSelectedKey((currentSelectedKey) =>
          currentSelectedKey &&
          next.items.some((item) => createLibraryItemIdentity(item) === currentSelectedKey)
            ? currentSelectedKey
            : next.items.length > 0
              ? createLibraryItemIdentity(next.items[0])
              : null,
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Library query failed');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const providers = snapshot?.providers ?? [];
  const items = snapshot?.items ?? [];

  const selectedItem =
    selectedKey === null
      ? null
      : (items.find((item) => createLibraryItemIdentity(item) === selectedKey) ?? null);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string }> = [];
    if (installedOnly) chips.push({ id: 'installed', label: 'Installed only' });
    if (kindFilter !== 'all') {
      chips.push({ id: 'kind', label: `Kind: ${itemKindLabel[kindFilter]}` });
    }
    if (providerFilter !== allProviderOption) {
      const providerTitle =
        providers.find((provider) => provider.sourceId === providerFilter)?.title ?? providerFilter;
      chips.push({ id: 'provider', label: `Provider: ${providerTitle}` });
    }
    if (searchText.trim()) {
      chips.push({ id: 'search', label: `Search: ${searchText.trim()}` });
    }
    return chips;
  }, [installedOnly, kindFilter, providerFilter, providers, searchText]);

  const clearAllFilters = () => {
    setInstalledOnly(false);
    setKindFilter('all');
    setProviderFilter(allProviderOption);
    setSearchText('');
  };

  const dismissFilter = (filterId: string) => {
    if (filterId === 'installed') setInstalledOnly(false);
    if (filterId === 'kind') setKindFilter('all');
    if (filterId === 'provider') setProviderFilter(allProviderOption);
    if (filterId === 'search') setSearchText('');
  };

  const statusSections = useMemo<StatusBarSectionModel[]>(
    () => [
      {
        id: 'result',
        items: [
          {
            id: 'result-count',
            icon: <i className="codicon codicon-list-selection" />,
            label: loading ? 'Loading catalog...' : `${items.length} items`,
          },
        ],
      },
      {
        id: 'providers',
        align: 'end',
        items: [
          {
            id: 'provider-count',
            icon: <i className="codicon codicon-package" />,
            label: `${providers.length} sources`,
          },
        ],
      },
    ],
    [loading, items.length, providers.length],
  );

  return (
    <WorkbenchShell
      activityBar={{
        items: [
          {
            id: 'library',
            icon: <i className="codicon codicon-extensions" />,
            label: 'Library',
            active: true,
          },
        ],
      }}
      compactStatus
      onStatusItemActivate={() => refreshCatalog(true)}
      primarySidebar={{
        className: 'ui-workbench-story-shell-split',
        isVisible: true,
        minPrimarySizePercent: 28,
        maxPrimarySizePercent: 46,
        node: (
          <SideBarViewFrame
            title="Library"
            actions={
              <Button disabled={loading} onClick={() => refreshCatalog(true)} variant="primary">
                Refresh
              </Button>
            }
            headerAddon={
              <SideBarHeaderControl>
                <TextInput
                  aria-label="Search library"
                  controlWidth="full"
                  placeholder="Search id/title/tag"
                  value={searchText}
                  onChange={(event) => setSearchText(event.currentTarget.value)}
                />
                <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                  <label>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Provider</span>
                    <Select
                      controlWidth="full"
                      value={providerFilter}
                      onChange={(event) => setProviderFilter(event.currentTarget.value)}
                    >
                      <option value={allProviderOption}>All providers</option>
                      {providers.map((provider) => (
                        <option key={provider.sourceId} value={provider.sourceId}>
                          {provider.title}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Kind</span>
                    <Select
                      controlWidth="full"
                      value={kindFilter}
                      onChange={(event) =>
                        setKindFilter(event.currentTarget.value as LibraryItemKind | 'all')
                      }
                    >
                      <option value="all">All kinds</option>
                      {allItemKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {itemKindLabel[kind]}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Sort</span>
                    <Select
                      controlWidth="full"
                      value={sortBy}
                      onChange={(event) => setSortBy(event.currentTarget.value as LibrarySortMode)}
                    >
                      <option value="provider">By provider</option>
                      <option value="title">By title</option>
                      <option value="installed">Installed first</option>
                    </Select>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input
                      checked={installedOnly}
                      type="checkbox"
                      onChange={(event) => setInstalledOnly(event.currentTarget.checked)}
                    />
                    <span style={{ fontSize: 12 }}>Installed only</span>
                  </label>
                </div>
              </SideBarHeaderControl>
            }
          >
            {error ? (
              <EmptyState icon="codicon-error" title="Catalog error">
                {error}
              </EmptyState>
            ) : null}
            <SideBarList>
              {items.map((item) => {
                const key = createLibraryItemIdentity(item);
                return (
                  <SideBarListItem
                    key={key}
                    aria-label={`Open ${item.title}`}
                    selected={key === selectedKey}
                    draggable
                    onClick={() => setSelectedKey(key)}
                    onDragStart={(event) => {
                      const sourceId = resolveLibraryItemProviderId(item);
                      event.dataTransfer.setData(
                        LIBRARY_DRAG_DATA_TYPE,
                        createLibraryDragPayload([item.id], sourceId ? [sourceId] : []),
                      );
                      event.dataTransfer.setData(
                        LIBRARY_DRAG_IDS_DATA_TYPE,
                        JSON.stringify([item.id]),
                      );
                      event.dataTransfer.effectAllowed = 'copy';
                    }}
                  >
                    <span
                      style={{
                        alignItems: 'center',
                        display: 'flex',
                        gap: 8,
                      }}
                    >
                      <i className="codicon codicon-package" />
                      <strong>{item.title}</strong>
                    </span>
                    <span style={{ color: 'var(--color-text-subtle)', fontSize: 12 }}>
                      {item.description ?? item.id}
                    </span>
                  </SideBarListItem>
                );
              })}
            </SideBarList>
          </SideBarViewFrame>
        ),
        onSizePercentChange: () => undefined,
        primarySizePercent: 38,
      }}
      secondaryArea={
        <section style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', minHeight: 0 }}>
          {activeFilterChips.length > 0 ? (
            <FilterBar aria-label="Active library filters">
              <FilterBarActiveChips onClearAll={clearAllFilters}>
                {activeFilterChips.map((chip) => (
                  <FilterChip
                    key={chip.id}
                    aria-label={`Remove ${chip.label} filter`}
                    count={items.length}
                    label={chip.label}
                    onDismiss={() => dismissFilter(chip.id)}
                  />
                ))}
              </FilterBarActiveChips>
            </FilterBar>
          ) : null}
          <section style={{ padding: 20, minHeight: 0, overflow: 'auto' }}>
            {selectedItem ? (
              <article style={{ display: 'grid', gap: 12 }}>
                <h2 style={{ margin: 0 }}>{selectedItem.title}</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge>{itemKindLabel[selectedItem.kind] ?? selectedItem.kind}</Badge>
                  {selectedItem.installed ? <Badge variant="accent">Installed</Badge> : null}
                </div>
                <p style={{ margin: 0, color: 'var(--color-text-subtle)' }}>
                  {selectedItem.description ?? 'No description provided'}
                </p>
                <dl style={{ margin: 0, display: 'grid', gap: 6 }}>
                  <div>
                    <dt style={{ fontWeight: 600 }}>Provider</dt>
                    <dd style={{ fontWeight: 600, margin: 0 }}>
                      {resolveLibraryItemProviderId(selectedItem)}
                    </dd>
                  </div>
                  <div>
                    <dt style={{ fontWeight: 600 }}>Source</dt>
                    <dd style={{ margin: 0 }}>{selectedItem.source.ref}</dd>
                  </div>
                  <div>
                    <dt style={{ fontWeight: 600 }}>Tags</dt>
                    <dd style={{ margin: 0 }}>
                      {selectedItem.tags?.length ? selectedItem.tags.join(', ') : 'No tags'}
                    </dd>
                  </div>
                </dl>
              </article>
            ) : (
              <EmptyState icon="codicon-search" title="No item selected">
                선택한 항목이 없거나 검색 조건이 없습니다.
              </EmptyState>
            )}
          </section>
        </section>
      }
      statusSections={statusSections}
      rootClassName="ide-root"
      rootStyle={{ height: 'min(calc(100% - 140px), 720px)', minHeight: 0 }}
    />
  );
}
