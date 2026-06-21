import { useMemo, useState } from 'react';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { TabbedPanels } from '../../primitives/WorkbenchChrome';
import {
  extensionCategoryIcon,
  extensionCategoryIconTone,
  formatExtensionCategoryLabel,
} from './extension-category-display.js';
import { ManagementFilterChips } from './ManagementFilterChips.js';
import { ManagementCard, ManagementCardList } from './ManagementCard.js';
import { ManagementGroup, ManagementGroups } from './ManagementGroup.js';
import { ManagementPanelControls } from './ManagementPanelControls.js';
import {
  ManagementPanelEmptyState,
  ManagementPanelFrame,
  ManagementPanelNotice,
} from './ManagementPanelFrame.js';
import type {
  ExtensionCatalogBrowseEntry,
  ExtensionInstallPlanSummary,
  ExtensionManagementEntry,
  ExtensionManagementFeatureSummary,
  ExtensionManagementPanelProps,
} from './types.js';

const BROWSE_CATEGORIES = ['all', 'feature', 'editor', 'theme', 'language'] as const;
const EXTENSION_MANAGEMENT_DEFAULT_TAB = 'installed' as const;

type BrowseCategoryFilter = (typeof BROWSE_CATEGORIES)[number];

const CATEGORY_FILTER_OPTIONS = BROWSE_CATEGORIES.map((category) => ({
  label: category === 'all' ? 'All' : formatExtensionCategoryLabel(category),
  value: category,
}));

export function ExtensionManagementPanel({
  browseEntries,
  catalogError,
  catalogLoading = false,
  className,
  installedEntries,
  onInstall,
  onToggleEnabled,
}: ExtensionManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<'installed' | 'browse'>(
    EXTENSION_MANAGEMENT_DEFAULT_TAB,
  );
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
  const showBrowseGroups = categoryFilter === 'all' && browseGroups.length > 1;

  return (
    <ManagementPanelFrame
      className={className}
      description="Install packs from the catalog, manage bundled extensions, and apply themes or languages from Settings → Appearance."
      id="workbench-extension-management"
      title="Extensions"
    >
      <TabbedPanels
        activeId={activeTab}
        className="workbench-management-tabs"
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
                entries={filteredBrowse}
                groups={browseGroups}
                query={browseQuery}
                showGroups={showBrowseGroups}
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
      <ManagementPanelNotice>
        Installing or toggling extensions reloads the workbench to apply contributions.
      </ManagementPanelNotice>
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
      <ManagementPanelControls
        filterLabel="Filter installed extensions"
        filterPlaceholder="Search by name, id, or category"
        query={query}
        summary={summary}
        onQueryChange={onQueryChange}
      />
      {entries.length === 0 ? (
        <ManagementPanelEmptyState>{emptyLabel}</ManagementPanelEmptyState>
      ) : (
        <ManagementCardList>
          {entries.map((entry) => (
            <li key={entry.id}>
              <ManagementCard
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
                badges={
                  <>
                    <Badge variant="muted">{formatExtensionCategoryLabel(entry.category)}</Badge>
                    {entry.source === 'bundled' ? (
                      <Badge variant="muted">Built-in</Badge>
                    ) : (
                      <Badge variant={entry.enabled ? 'accent' : 'muted'}>
                        {entry.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    )}
                  </>
                }
                description={entry.description}
                icon={extensionCategoryIcon(entry.category)}
                iconTone={extensionCategoryIconTone(entry.category)}
                id={entry.id}
                title={entry.displayName}
              >
                <ExtensionFeatureDetails entry={entry} />
              </ManagementCard>
            </li>
          ))}
        </ManagementCardList>
      )}
    </>
  );
}

function ExtensionFeatureDetails({ entry }: { entry: ExtensionManagementEntry }) {
  const rows = getExtensionFeatureDetailRows(entry.features);
  const diagnostics = entry.diagnostics ?? [];

  if (rows.length === 0 && diagnostics.length === 0) {
    return null;
  }

  return (
    <dl className="workbench-management-card__details">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
      {diagnostics.length > 0 ? (
        <div>
          <dt>Diagnostics</dt>
          <dd>{diagnostics.map((diagnostic) => diagnostic.message).join(' ')}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function getExtensionFeatureDetailRows(features: ExtensionManagementFeatureSummary | undefined) {
  if (!features) {
    return [];
  }

  return [
    createFeatureDetailRow('Commands', features.commands),
    createFeatureDetailRow('Document views', features.documentViews),
    createFeatureDetailRow('Settings', features.settings),
    createFeatureDetailRow('Views', features.views),
    createFeatureDetailRow('Menus', features.menus),
    createTextListDetailRow('Capabilities', [
      ...(features.capabilities?.requires ?? []),
      ...(features.capabilities?.provides ?? []),
    ]),
    createTextListDetailRow('Permissions', features.permissions ?? []),
  ].filter((row): row is { label: string; value: string } => row !== undefined);
}

function createFeatureDetailRow(label: string, items: readonly { label: string }[] | undefined) {
  if (!items?.length) {
    return undefined;
  }

  return {
    label,
    value: formatFeatureList(items.map((item) => item.label)),
  };
}

function createTextListDetailRow(label: string, items: readonly string[]) {
  if (items.length === 0) {
    return undefined;
  }

  return {
    label,
    value: formatFeatureList(items),
  };
}

function formatFeatureList(items: readonly string[]) {
  const visibleItems = items.slice(0, 3);
  const suffix =
    items.length > visibleItems.length ? ` +${items.length - visibleItems.length}` : '';
  return `${visibleItems.join(', ')}${suffix}`;
}

function BrowseExtensionsTab({
  catalogError,
  catalogLoading,
  categoryFilter,
  emptyLabel,
  entries,
  groups,
  onCategoryChange,
  onInstall,
  onQueryChange,
  query,
  showGroups,
  summary,
}: {
  catalogError?: string | undefined;
  catalogLoading?: boolean | undefined;
  categoryFilter: BrowseCategoryFilter;
  emptyLabel: string;
  entries: readonly ExtensionCatalogBrowseEntry[];
  groups: ReadonlyArray<{ category: string; entries: readonly ExtensionCatalogBrowseEntry[] }>;
  onCategoryChange: (category: BrowseCategoryFilter) => void;
  onInstall?: ExtensionManagementPanelProps['onInstall'];
  onQueryChange: (query: string) => void;
  query: string;
  showGroups: boolean;
  summary: string;
}) {
  const flatEntries = showGroups ? [] : entries;

  return (
    <>
      <ManagementPanelControls
        filterLabel="Filter catalog extensions"
        filterPlaceholder="Search catalog"
        filters={
          <ManagementFilterChips
            ariaLabel="Catalog categories"
            options={CATEGORY_FILTER_OPTIONS}
            value={categoryFilter}
            onChange={onCategoryChange}
          />
        }
        query={query}
        summary={summary}
        onQueryChange={onQueryChange}
      />
      {catalogLoading ? (
        <ManagementPanelEmptyState>Loading catalog…</ManagementPanelEmptyState>
      ) : null}
      {catalogError ? <ManagementPanelEmptyState>{catalogError}</ManagementPanelEmptyState> : null}
      {!catalogLoading && !catalogError && entries.length === 0 ? (
        <ManagementPanelEmptyState>{emptyLabel}</ManagementPanelEmptyState>
      ) : null}
      {!catalogLoading && !catalogError && showGroups ? (
        <ManagementGroups>
          {groups.map((group) => (
            <ManagementGroup
              key={group.category}
              count={group.entries.length}
              icon={extensionCategoryIcon(group.category)}
              label={formatExtensionCategoryLabel(group.category)}
              labelId={`workbench-extension-category-${group.category}`}
              variant="section"
            >
              <ManagementCardList>
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <ExtensionCatalogCard
                      entry={entry}
                      onInstall={onInstall}
                      showCategory={false}
                    />
                  </li>
                ))}
              </ManagementCardList>
            </ManagementGroup>
          ))}
        </ManagementGroups>
      ) : null}
      {!catalogLoading && !catalogError && !showGroups && flatEntries.length > 0 ? (
        <ManagementCardList>
          {flatEntries.map((entry) => (
            <li key={entry.id}>
              <ExtensionCatalogCard entry={entry} onInstall={onInstall} showCategory />
            </li>
          ))}
        </ManagementCardList>
      ) : null}
    </>
  );
}

function ExtensionCatalogCard({
  entry,
  onInstall,
  showCategory,
}: {
  entry: ExtensionCatalogBrowseEntry;
  onInstall?: ExtensionManagementPanelProps['onInstall'];
  showCategory: boolean;
}) {
  return (
    <ManagementCard
      actions={
        <Button
          compact
          disabled={!onInstall || entry.installed || entry.installPlan?.blocked}
          icon={
            entry.installed ? 'check' : entry.installPlan?.blocked ? 'warning' : 'cloud-download'
          }
          type="button"
          variant={entry.installed ? 'default' : 'primary'}
          onClick={() => onInstall?.(entry)}
        >
          {entry.installed ? 'Installed' : entry.installPlan?.blocked ? 'Blocked' : 'Install'}
        </Button>
      }
      badges={
        <>
          {showCategory ? (
            <Badge variant="muted">{formatExtensionCategoryLabel(entry.category)}</Badge>
          ) : null}
          {entry.installed ? <Badge variant="accent">Installed</Badge> : null}
          {entry.installPlan?.blocked ? <Badge variant="danger">Blocked</Badge> : null}
          {entry.installPlan?.requiresApproval && !entry.installed ? (
            <Badge variant="muted">Approval required</Badge>
          ) : null}
        </>
      }
      description={entry.description}
      icon={extensionCategoryIcon(entry.category)}
      iconTone={extensionCategoryIconTone(entry.category)}
      id={entry.id}
      title={entry.displayName}
    >
      <ExtensionInstallPlanDetails plan={entry.installPlan} />
    </ManagementCard>
  );
}

function ExtensionInstallPlanDetails({ plan }: { plan?: ExtensionInstallPlanSummary | undefined }) {
  const rows = getExtensionInstallPlanRows(plan);
  const diagnostics = plan?.diagnostics ?? [];

  if (rows.length === 0 && diagnostics.length === 0) {
    return null;
  }

  return (
    <dl className="workbench-management-card__details">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
      {diagnostics.length > 0 ? (
        <div>
          <dt>Install review</dt>
          <dd>{diagnostics.map((diagnostic) => diagnostic.message).join(' ')}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function getExtensionInstallPlanRows(plan: ExtensionInstallPlanSummary | undefined) {
  if (!plan) {
    return [];
  }

  return [
    createTextListDetailRow('Will install', plan.installExtensionIds ?? []),
    createTextListDetailRow('Will enable', plan.enableExtensionIds ?? []),
    createTextListDetailRow('Permissions', plan.permissions ?? []),
  ].filter((row): row is { label: string; value: string } => row !== undefined);
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
