import { useMemo, useState, type ReactNode } from 'react';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { TabbedPanels } from '../../primitives/WorkbenchChrome';
import { cx } from '../../utils/cx';
import {
  ManagementPanelEmptyState,
  ManagementPanelFrame,
  ManagementPanelToolbar,
} from './ManagementPanelFrame.js';
import type {
  ExtensionCatalogBrowseEntry,
  ExtensionManagementEntry,
  ExtensionManagementPanelProps,
} from './types.js';

const BROWSE_CATEGORIES = ['all', 'feature', 'editor', 'theme', 'language'] as const;

type BrowseCategoryFilter = (typeof BROWSE_CATEGORIES)[number];

export function ExtensionManagementPanel({
  browseEntries,
  catalogError,
  catalogLoading = false,
  className,
  installedEntries,
  onInstall,
  onToggleEnabled,
}: ExtensionManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<'installed' | 'browse'>('installed');
  const [installedQuery, setInstalledQuery] = useState('');
  const [browseQuery, setBrowseQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BrowseCategoryFilter>('all');

  const filteredInstalled = useMemo(
    () => filterInstalledEntries(installedEntries, installedQuery),
    [installedEntries, installedQuery],
  );
  const filteredBrowse = useMemo(
    () =>
      filterBrowseEntries(
        browseEntries,
        browseQuery,
        categoryFilter === 'all' ? undefined : categoryFilter,
      ),
    [browseEntries, browseQuery, categoryFilter],
  );

  const browseGroups = useMemo(() => groupBrowseEntries(filteredBrowse), [filteredBrowse]);

  return (
    <ManagementPanelFrame
      className={className}
      description="Install packs from the catalog, manage bundled extensions, and apply themes or languages from Settings → Appearance."
      id="workbench-extension-management"
      title="Extensions"
    >
      <TabbedPanels
        activeId={activeTab}
        items={[
          {
            id: 'installed',
            label: `Installed (${installedEntries.length})`,
            panel: (
              <InstalledExtensionsTab
                emptyLabel="No installed extensions match the current filter."
                entries={filteredInstalled}
                query={installedQuery}
                summary={`${filteredInstalled.length} of ${installedEntries.length} visible`}
                onQueryChange={setInstalledQuery}
                onToggleEnabled={onToggleEnabled}
              />
            ),
          },
          {
            id: 'browse',
            label: 'Browse catalog',
            panel: (
              <BrowseExtensionsTab
                catalogError={catalogError}
                catalogLoading={catalogLoading}
                categoryFilter={categoryFilter}
                emptyLabel="No catalog extensions match the current filter."
                groups={browseGroups}
                query={browseQuery}
                summary={`${filteredBrowse.length} of ${browseEntries.length} in catalog`}
                onCategoryChange={setCategoryFilter}
                onInstall={onInstall}
                onQueryChange={setBrowseQuery}
              />
            ),
          },
        ]}
        onSelect={(tabId) => setActiveTab(tabId as 'installed' | 'browse')}
      />
      <p className="workbench-extension-management-notice">
        Installing or toggling extensions reloads the workbench to apply contributions.
      </p>
    </ManagementPanelFrame>
  );
}

function InstalledExtensionsTab({
  emptyLabel,
  entries,
  onQueryChange,
  onToggleEnabled,
  query,
  summary,
}: {
  emptyLabel: string;
  entries: readonly ExtensionManagementEntry[];
  onQueryChange: (query: string) => void;
  onToggleEnabled?: ExtensionManagementPanelProps['onToggleEnabled'];
  query: string;
  summary: string;
}) {
  return (
    <>
      <ManagementPanelToolbar
        filterLabel="Filter installed extensions"
        filterPlaceholder="Search by name, id, or category"
        query={query}
        summary={summary}
        onQueryChange={onQueryChange}
      />
      {entries.length === 0 ? (
        <ManagementPanelEmptyState>{emptyLabel}</ManagementPanelEmptyState>
      ) : (
        <ul className="workbench-extension-card-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <ExtensionCard
                actions={
                  <Button
                    compact
                    disabled={!onToggleEnabled || entry.source === 'bundled'}
                    type="button"
                    variant={entry.enabled ? 'default' : 'primary'}
                    onClick={() => onToggleEnabled?.(entry, !entry.enabled)}
                  >
                    {entry.enabled ? 'Disable' : 'Enable'}
                  </Button>
                }
                category={entry.category}
                description={entry.description}
                displayName={entry.displayName}
                id={entry.id}
                status={
                  entry.source === 'bundled' ? (
                    <Badge variant="muted">Built-in</Badge>
                  ) : (
                    <Badge variant={entry.enabled ? 'accent' : 'muted'}>
                      {entry.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function BrowseExtensionsTab({
  catalogError,
  catalogLoading,
  categoryFilter,
  emptyLabel,
  groups,
  onCategoryChange,
  onInstall,
  onQueryChange,
  query,
  summary,
}: {
  catalogError?: string | undefined;
  catalogLoading?: boolean | undefined;
  categoryFilter: BrowseCategoryFilter;
  emptyLabel: string;
  groups: ReadonlyArray<{ category: string; entries: readonly ExtensionCatalogBrowseEntry[] }>;
  onCategoryChange: (category: BrowseCategoryFilter) => void;
  onInstall?: ExtensionManagementPanelProps['onInstall'];
  onQueryChange: (query: string) => void;
  query: string;
  summary: string;
}) {
  return (
    <>
      <div className="workbench-extension-browse-controls">
        <ManagementPanelToolbar
          filterLabel="Filter catalog extensions"
          filterPlaceholder="Search catalog"
          query={query}
          summary={summary}
          onQueryChange={onQueryChange}
        />
        <div
          aria-label="Catalog categories"
          className="workbench-extension-category-filters"
          role="toolbar"
        >
          {BROWSE_CATEGORIES.map((category) => (
            <button
              key={category}
              aria-pressed={categoryFilter === category}
              className={cx(
                'workbench-extension-category-filter',
                categoryFilter === category && 'workbench-extension-category-filter--active',
              )}
              type="button"
              onClick={() => onCategoryChange(category)}
            >
              {category === 'all' ? 'All' : formatCategoryLabel(category)}
            </button>
          ))}
        </div>
      </div>
      {catalogLoading ? (
        <ManagementPanelEmptyState>Loading catalog…</ManagementPanelEmptyState>
      ) : null}
      {catalogError ? <ManagementPanelEmptyState>{catalogError}</ManagementPanelEmptyState> : null}
      {!catalogLoading && !catalogError && groups.length === 0 ? (
        <ManagementPanelEmptyState>{emptyLabel}</ManagementPanelEmptyState>
      ) : null}
      {!catalogLoading && !catalogError && groups.length > 0 ? (
        <div className="workbench-extension-browse-groups">
          {groups.map((group) => (
            <section
              key={group.category}
              aria-label={formatCategoryLabel(group.category)}
              className="workbench-extension-browse-group"
            >
              <header className="workbench-extension-browse-group__header">
                <i
                  aria-hidden
                  className={cx(
                    'codicon',
                    categoryIcon(group.category),
                    'workbench-extension-browse-group__icon',
                  )}
                />
                <h3 className="workbench-extension-browse-group__title">
                  {formatCategoryLabel(group.category)}
                </h3>
                <Badge variant="muted">{group.entries.length}</Badge>
              </header>
              <ul className="workbench-extension-card-list">
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <ExtensionCard
                      actions={
                        <Button
                          compact
                          disabled={!onInstall || entry.installed}
                          icon={entry.installed ? 'check' : 'cloud-download'}
                          type="button"
                          variant={entry.installed ? 'default' : 'primary'}
                          onClick={() => onInstall?.(entry)}
                        >
                          {entry.installed ? 'Installed' : 'Install'}
                        </Button>
                      }
                      category={entry.category}
                      description={entry.description}
                      displayName={entry.displayName}
                      id={entry.id}
                      status={entry.installed ? <Badge variant="accent">Installed</Badge> : null}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </>
  );
}

function ExtensionCard({
  actions,
  category,
  description,
  displayName,
  id,
  status,
}: {
  actions: ReactNode;
  category: string;
  description?: string | undefined;
  displayName: string;
  id: string;
  status?: ReactNode;
}) {
  return (
    <article className="workbench-extension-card">
      <div
        aria-hidden
        className={cx(
          'workbench-extension-card__icon-wrap',
          `workbench-extension-card__icon-wrap--${sanitizeCategoryClass(category)}`,
        )}
      >
        <i className={cx('codicon', categoryIcon(category), 'workbench-extension-card__icon')} />
      </div>
      <div className="workbench-extension-card__body">
        <div className="workbench-extension-card__header">
          <span className="workbench-extension-card__title">{displayName}</span>
          <div className="workbench-extension-card__badges">
            <Badge variant="muted">{formatCategoryLabel(category)}</Badge>
            {status}
          </div>
        </div>
        <code className="workbench-extension-card__id">{id}</code>
        {description ? (
          <p className="workbench-extension-card__description">{description}</p>
        ) : null}
      </div>
      <div className="workbench-extension-card__actions">{actions}</div>
    </article>
  );
}

function groupBrowseEntries(entries: readonly ExtensionCatalogBrowseEntry[]) {
  const order = ['feature', 'editor', 'theme', 'language'];
  const grouped = new Map<string, ExtensionCatalogBrowseEntry[]>();

  for (const entry of entries) {
    const list = grouped.get(entry.category) ?? [];
    list.push(entry);
    grouped.set(entry.category, list);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => {
      const leftIndex = order.indexOf(left);
      const rightIndex = order.indexOf(right);
      return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
    })
    .map(([category, categoryEntries]) => ({ category, entries: categoryEntries }));
}

function filterInstalledEntries(entries: readonly ExtensionManagementEntry[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return entries;
  }

  return entries.filter((entry) =>
    [entry.displayName, entry.id, entry.category, entry.description ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalized),
  );
}

function filterBrowseEntries(
  entries: readonly ExtensionCatalogBrowseEntry[],
  query: string,
  category?: string,
) {
  const normalized = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (category && entry.category !== category) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    return [entry.displayName, entry.id, entry.category, entry.description]
      .join(' ')
      .toLowerCase()
      .includes(normalized);
  });
}

function formatCategoryLabel(category: string) {
  switch (category) {
    case 'feature':
      return 'Features';
    case 'editor':
      return 'Editors';
    case 'theme':
      return 'Themes';
    case 'language':
      return 'Languages';
    default:
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

function categoryIcon(category: string) {
  switch (category) {
    case 'theme':
      return 'codicon-symbol-color';
    case 'language':
      return 'codicon-globe';
    case 'editor':
      return 'codicon-file-code';
    default:
      return 'codicon-extensions';
  }
}

function sanitizeCategoryClass(category: string) {
  return category.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}
