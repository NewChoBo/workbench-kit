import { useMemo, useState, type ReactNode } from 'react';
import { SideBarHeaderControl, SideBarList, SideBarViewFrame } from '../../layout/SideBarViewFrame';
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
  ExtensionInstallPlanSummary,
  ExtensionManagementEntry,
  ExtensionManagementFeatureSummary,
  ExtensionManagementPanelProps,
} from './types.js';

const BROWSE_CATEGORIES = ['all', 'feature', 'editor', 'theme', 'language'] as const;

type BrowseCategoryFilter = (typeof BROWSE_CATEGORIES)[number];

const CATEGORY_FILTER_OPTIONS = BROWSE_CATEGORIES.map((category) => ({
  label: category === 'all' ? 'All' : formatExtensionCategoryLabel(category),
  value: category,
}));

export interface ExtensionManagementSidebarProps extends ExtensionManagementPanelProps {
  defaultTab?: 'installed' | 'marketplace' | undefined;
  emptyInstalledLabel?: string | undefined;
  emptyMarketplaceLabel?: string | undefined;
  missingExtensionIds?: readonly string[] | undefined;
  pendingAction?: ExtensionManagementPendingAction | undefined;
}

export interface ExtensionManagementPendingAction {
  readonly entryId: string;
  readonly kind: 'install' | 'toggle';
}

export function ExtensionManagementSidebar({
  browseEntries,
  catalogError,
  catalogLoading = false,
  className,
  defaultTab = 'marketplace',
  emptyInstalledLabel = 'No installed extensions match the filter.',
  emptyMarketplaceLabel = 'No marketplace extensions match the filter.',
  installedEntries,
  missingExtensionIds = [],
  onInstall,
  onToggleEnabled,
  pendingAction,
}: ExtensionManagementSidebarProps) {
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>(defaultTab);
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
        <p className="workbench-extensions-sidebar__notice" role="note">
          <i aria-hidden className={cxCodicon('codicon-info')} />
          Installing or enabling extensions reloads the workbench to apply contributions.
        </p>
      }
      footerPlacement="overlay"
      headerAddon={
        <div className="workbench-extensions-sidebar__controls">
          {missingExtensionIds.length > 0 ? (
            <div className="workbench-extensions-sidebar__alert" role="alert">
              <strong>Missing extensions</strong>
              <p>
                {missingExtensionIds.length} enabled extension
                {missingExtensionIds.length === 1 ? ' is' : 's are'} unavailable:{' '}
                {missingExtensionIds.join(', ')}
              </p>
            </div>
          ) : null}
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
          pendingAction={pendingAction}
          onInstall={onInstall}
        />
      ) : (
        <InstalledExtensionList
          emptyLabel={emptyInstalledLabel}
          entries={filteredInstalled}
          pendingAction={pendingAction}
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
  pendingAction,
}: {
  emptyLabel: string;
  entries: readonly ExtensionManagementEntry[];
  onToggleEnabled?: ExtensionManagementPanelProps['onToggleEnabled'];
  pendingAction?: ExtensionManagementPendingAction | undefined;
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
      {entries.map((entry) => {
        const isPendingToggle =
          pendingAction?.kind === 'toggle' && pendingAction.entryId === entry.id;
        const errorDiagnostics = (entry.diagnostics ?? []).filter(
          (diagnostic) => diagnostic.severity === 'error',
        );
        const warningDiagnostics = (entry.diagnostics ?? []).filter(
          (diagnostic) => diagnostic.severity === 'warning',
        );

        return (
          <ExtensionSidebarListItem
            key={entry.id}
            action={
              <Button
                compact
                disabled={!onToggleEnabled || entry.source === 'bundled' || isPendingToggle}
                type="button"
                variant={entry.enabled ? 'default' : 'primary'}
                onClick={() => onToggleEnabled?.(entry, !entry.enabled)}
              >
                {isPendingToggle ? 'Reloading…' : entry.enabled ? 'Disable' : 'Enable'}
              </Button>
            }
            category={entry.category}
            description={entry.description}
            diagnostics={entry.diagnostics}
            features={entry.features}
            meta={
              <>
                {entry.source === 'bundled' ? (
                  <Badge variant="muted">Built-in</Badge>
                ) : (
                  <Badge variant={entry.enabled ? 'accent' : 'muted'}>
                    {entry.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                )}
                {errorDiagnostics.length > 0 ? (
                  <Badge title={errorDiagnostics.map((diagnostic) => diagnostic.message).join(' ')} variant="danger">
                    {errorDiagnostics.length} error{errorDiagnostics.length === 1 ? '' : 's'}
                  </Badge>
                ) : null}
                {warningDiagnostics.length > 0 ? (
                  <Badge
                    title={warningDiagnostics.map((diagnostic) => diagnostic.message).join(' ')}
                    variant="muted"
                  >
                    {warningDiagnostics.length} warning{warningDiagnostics.length === 1 ? '' : 's'}
                  </Badge>
                ) : null}
              </>
            }
            title={entry.displayName}
          />
        );
      })}
    </SideBarList>
  );
}

function MarketplaceExtensionList({
  catalogError,
  catalogLoading,
  emptyLabel,
  entries,
  onInstall,
  pendingAction,
}: {
  catalogError?: string | undefined;
  catalogLoading?: boolean | undefined;
  emptyLabel: string;
  entries: readonly ExtensionCatalogBrowseEntry[];
  onInstall?: ExtensionManagementPanelProps['onInstall'];
  pendingAction?: ExtensionManagementPendingAction | undefined;
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
      {entries.map((entry) => {
        const isPendingInstall =
          pendingAction?.kind === 'install' && pendingAction.entryId === entry.id;
        const blockedDiagnostics = entry.installPlan?.diagnostics ?? [];

        return (
          <ExtensionSidebarListItem
            key={entry.id}
            action={
              <Button
                compact
                disabled={
                  !onInstall || entry.installed || entry.installPlan?.blocked || isPendingInstall
                }
                icon={
                  entry.installed
                    ? 'check'
                    : entry.installPlan?.blocked
                      ? 'warning'
                      : isPendingInstall
                        ? 'loading'
                        : 'cloud-download'
                }
                type="button"
                variant={entry.installed ? 'default' : 'primary'}
                onClick={() => onInstall?.(entry)}
              >
                {entry.installed
                  ? 'Installed'
                  : isPendingInstall
                    ? 'Reloading…'
                    : entry.installPlan?.blocked
                      ? 'Blocked'
                      : 'Install'}
              </Button>
            }
            category={entry.category}
            description={entry.description}
            diagnostics={blockedDiagnostics}
            installPlan={entry.installPlan}
            meta={entry.installed ? <Badge variant="accent">Installed</Badge> : null}
            title={entry.displayName}
          />
        );
      })}
    </SideBarList>
  );
}

function ExtensionSidebarListItem({
  action,
  category,
  description,
  diagnostics,
  features,
  installPlan,
  meta,
  title,
}: {
  action: ReactNode;
  category: string;
  description?: string | undefined;
  diagnostics?: readonly { message: string; severity: 'error' | 'warning' }[] | undefined;
  features?: ExtensionManagementFeatureSummary | undefined;
  installPlan?: ExtensionInstallPlanSummary | undefined;
  meta?: ReactNode;
  title: string;
}) {
  const iconTone = extensionCategoryIconTone(category);
  const featureBadges = [
    ...getExtensionFeatureBadges(features),
    ...getExtensionInstallPlanBadges(installPlan),
  ];

  return (
    <li className="ui-side-bar-list-entry">
      <div className="ui-side-bar-list-item workbench-extensions-sidebar__item">
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
            {diagnostics && diagnostics.length > 0 ? (
              <ul className="workbench-extensions-sidebar__diagnostics">
                {diagnostics.map((diagnostic) => (
                  <li
                    key={`${diagnostic.severity}:${diagnostic.message}`}
                    className={cx(
                      'workbench-extensions-sidebar__diagnostic',
                      `workbench-extensions-sidebar__diagnostic--${diagnostic.severity}`,
                    )}
                  >
                    {diagnostic.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {featureBadges.length > 0 ? (
              <div className="workbench-extensions-sidebar__features">
                {featureBadges.map((badge) => (
                  <span key={badge}>{badge}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="workbench-extensions-sidebar__actions">{action}</div>
      </div>
    </li>
  );
}

function getExtensionInstallPlanBadges(plan: ExtensionInstallPlanSummary | undefined) {
  if (!plan) {
    return [];
  }

  return [
    plan.blocked ? 'Blocked' : undefined,
    formatFeatureBadge('Install', plan.installExtensionIds?.length ?? 0),
    formatFeatureBadge('Enable', plan.enableExtensionIds?.length ?? 0),
    formatFeatureBadge('Permissions', plan.permissions?.length ?? 0),
  ].filter((badge): badge is string => badge !== undefined);
}

function getExtensionFeatureBadges(features: ExtensionManagementFeatureSummary | undefined) {
  if (!features) {
    return [];
  }

  return [
    formatFeatureBadge('Commands', features.commands?.length ?? 0),
    formatFeatureBadge('Document views', features.documentViews?.length ?? 0),
    formatFeatureBadge('Settings', features.settings?.length ?? 0),
    formatFeatureBadge('Views', features.views?.length ?? 0),
    formatFeatureBadge(
      'Capabilities',
      (features.capabilities?.requires.length ?? 0) + (features.capabilities?.provides.length ?? 0),
    ),
    formatFeatureBadge('Permissions', features.permissions?.length ?? 0),
  ].filter((badge): badge is string => badge !== undefined);
}

function formatFeatureBadge(label: string, count: number) {
  if (count === 0) {
    return undefined;
  }

  return `${label} ${count}`;
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
