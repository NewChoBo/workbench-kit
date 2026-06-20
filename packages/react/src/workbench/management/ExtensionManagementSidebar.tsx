import { useMemo, useState, type ReactNode } from 'react';
import {
  SideBarHeaderControl,
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
} from '../../layout/SideBarViewFrame';
import { SidebarToolbar } from '../../layout/SidebarToolbar';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { ClearableTextInput } from '../../primitives/ClearableTextInput';
import { EmptyState } from '../../primitives/EmptyState';
import { SegmentedControl } from '../../primitives/WorkbenchEditor';
import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';
import {
  extensionCategoryIcon,
  extensionCategoryIconTone,
  formatExtensionCategoryLabel,
} from './extension-category-display.js';
import { ManagementFilterChips } from './ManagementFilterChips.js';
import type {
  ExtensionCatalogBrowseEntry,
  ExtensionManagementEntry,
  ExtensionManagementPanelProps,
} from './types.js';

const BROWSE_CATEGORIES = ['all', 'feature', 'editor', 'theme', 'language'] as const;

type BrowseCategoryFilter = (typeof BROWSE_CATEGORIES)[number];

const CATEGORY_FILTER_OPTIONS = BROWSE_CATEGORIES.map((category) => ({
  label: category === 'all' ? 'All' : formatExtensionCategoryLabel(category),
  value: category,
}));

export interface ExtensionManagementSidebarProps extends ExtensionManagementPanelProps {
  emptyInstalledLabel?: string | undefined;
  emptyMarketplaceLabel?: string | undefined;
}

export function ExtensionManagementSidebar({
  browseEntries,
  catalogError,
  catalogLoading = false,
  className,
  emptyInstalledLabel = 'No installed extensions match the filter.',
  emptyMarketplaceLabel = 'No marketplace extensions match the filter.',
  installedEntries,
  onInstall,
  onToggleEnabled,
}: ExtensionManagementSidebarProps) {
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('marketplace');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BrowseCategoryFilter>('all');

  const filteredInstalled = useMemo(
    () => filterInstalledEntries(installedEntries, query),
    [installedEntries, query],
  );
  const filteredBrowse = useMemo(
    () =>
      filterBrowseEntries(
        browseEntries,
        query,
        categoryFilter === 'all' ? undefined : categoryFilter,
      ),
    [browseEntries, categoryFilter, query],
  );

  const isMarketplace = activeTab === 'marketplace';
  const visibleCount = isMarketplace ? filteredBrowse.length : filteredInstalled.length;
  const totalCount = isMarketplace ? browseEntries.length : installedEntries.length;

  return (
    <SideBarViewFrame
      actions={
        <SidebarToolbar>
          <Badge variant="muted">
            {visibleCount}/{totalCount}
          </Badge>
        </SidebarToolbar>
      }
      bodyClassName="ui-side-bar-view__body--dock-sections"
      className={cx('workbench-extensions-sidebar', className)}
      footer={
        <p className="workbench-extensions-sidebar__notice">
          Installing or toggling extensions reloads the workbench.
        </p>
      }
      footerPlacement="overlay"
      headerAddon={
        <div className="workbench-extensions-sidebar__controls">
          <SegmentedControl
            ariaLabel="Extension lists"
            options={[
              { label: 'Installed', value: 'installed' },
              { label: 'Marketplace', value: 'marketplace' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
          <SideBarHeaderControl>
            <ClearableTextInput
              aria-label={
                isMarketplace ? 'Filter marketplace extensions' : 'Filter installed extensions'
              }
              clearLabel="Clear filter"
              controlWidth="full"
              placeholder="Filter extensions"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </SideBarHeaderControl>
          {isMarketplace ? (
            <ManagementFilterChips
              ariaLabel="Marketplace categories"
              options={CATEGORY_FILTER_OPTIONS}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          ) : null}
        </div>
      }
      title="Extensions"
    >
      {isMarketplace ? (
        <MarketplaceExtensionList
          catalogError={catalogError}
          catalogLoading={catalogLoading}
          emptyLabel={emptyMarketplaceLabel}
          entries={filteredBrowse}
          onInstall={onInstall}
        />
      ) : (
        <InstalledExtensionList
          emptyLabel={emptyInstalledLabel}
          entries={filteredInstalled}
          onToggleEnabled={onToggleEnabled}
        />
      )}
    </SideBarViewFrame>
  );
}

function InstalledExtensionList({
  emptyLabel,
  entries,
  onToggleEnabled,
}: {
  emptyLabel: string;
  entries: readonly ExtensionManagementEntry[];
  onToggleEnabled?: ExtensionManagementPanelProps['onToggleEnabled'];
}) {
  if (entries.length === 0) {
    return (
      <EmptyState compact icon="codicon-extensions">
        {emptyLabel}
      </EmptyState>
    );
  }

  return (
    <SideBarList aria-label="Installed extensions" className="workbench-extensions-sidebar__list">
      {entries.map((entry) => (
        <ExtensionSidebarListItem
          key={entry.id}
          action={
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
          meta={
            entry.source === 'bundled' ? (
              <Badge variant="muted">Built-in</Badge>
            ) : (
              <Badge variant={entry.enabled ? 'accent' : 'muted'}>
                {entry.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            )
          }
          title={entry.displayName}
        />
      ))}
    </SideBarList>
  );
}

function MarketplaceExtensionList({
  catalogError,
  catalogLoading,
  emptyLabel,
  entries,
  onInstall,
}: {
  catalogError?: string | undefined;
  catalogLoading?: boolean | undefined;
  emptyLabel: string;
  entries: readonly ExtensionCatalogBrowseEntry[];
  onInstall?: ExtensionManagementPanelProps['onInstall'];
}) {
  if (catalogLoading) {
    return (
      <EmptyState compact icon="codicon-loading">
        Loading catalog…
      </EmptyState>
    );
  }

  if (catalogError) {
    return (
      <EmptyState compact icon="codicon-warning">
        {catalogError}
      </EmptyState>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState compact icon="codicon-extensions">
        {emptyLabel}
      </EmptyState>
    );
  }

  return (
    <SideBarList aria-label="Marketplace extensions" className="workbench-extensions-sidebar__list">
      {entries.map((entry) => (
        <ExtensionSidebarListItem
          key={entry.id}
          action={
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
          meta={entry.installed ? <Badge variant="accent">Installed</Badge> : null}
          title={entry.displayName}
        />
      ))}
    </SideBarList>
  );
}

function ExtensionSidebarListItem({
  action,
  category,
  description,
  meta,
  title,
}: {
  action: ReactNode;
  category: string;
  description?: string | undefined;
  meta?: ReactNode;
  title: string;
}) {
  const iconTone = extensionCategoryIconTone(category);

  return (
    <SideBarListItem className="workbench-extensions-sidebar__item">
      <div className="workbench-extensions-sidebar__item-main">
        <div
          aria-hidden
          className={cx(
            'workbench-extensions-sidebar__icon',
            `workbench-extensions-sidebar__icon--${iconTone}`,
          )}
        >
          <i className={cxCodicon(extensionCategoryIcon(category))} />
        </div>
        <div className="workbench-extensions-sidebar__copy">
          <div className="workbench-extensions-sidebar__title-row">
            <span className="workbench-extensions-sidebar__title">{title}</span>
            {meta}
          </div>
          {description ? (
            <p className="workbench-extensions-sidebar__description">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="workbench-extensions-sidebar__actions">{action}</div>
    </SideBarListItem>
  );
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
