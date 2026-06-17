import {
  useMemo,
  useState,
  type ComponentPropsWithRef,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { WorkbenchSidebarSection } from '../../layout/WorkbenchSidebarActions';
import { SideBarList, SideBarListItem } from '../../layout/SideBarViewFrame';
import { EmptyState } from '../../primitives/EmptyState';
import { IconButton } from '../../primitives/IconButton';
import { cxCodicon } from '../../utils/codicon';
import { cx } from '../../utils/cx';
import {
  getWorkbenchStatusLabel,
  isWorkbenchStatusBusy,
  isWorkbenchStatusDisabled,
  type WorkbenchStatus,
} from '../status';

export type WorkbenchExplorerProviderKind =
  | 'artifacts'
  | 'config'
  | 'files'
  | 'session'
  | 'state'
  | 'virtual'
  | (string & {});

export type WorkbenchExplorerEntryKind =
  | 'artifact'
  | 'config'
  | 'file'
  | 'folder'
  | 'group'
  | 'session'
  | 'state'
  | 'virtual'
  | (string & {});

export interface WorkbenchExplorerActionDescriptor {
  danger?: boolean;
  disabled?: boolean;
  disabledReason?: ReactNode;
  icon?: string;
  id: string;
  label: string;
  metadata?: Record<string, unknown>;
  status?: WorkbenchStatus;
}

export interface WorkbenchExplorerEntryDescriptor {
  children?: readonly WorkbenchExplorerEntryDescriptor[];
  description?: ReactNode;
  disabled?: boolean;
  disabledReason?: ReactNode;
  icon?: string;
  id: string;
  kind?: WorkbenchExplorerEntryKind;
  label: ReactNode;
  metadata?: Record<string, unknown>;
  path?: string;
  selectable?: boolean;
  status?: WorkbenchStatus;
}

export interface WorkbenchExplorerProviderDescriptor {
  actions?: readonly WorkbenchExplorerActionDescriptor[];
  collapsible?: boolean;
  collapsed?: boolean;
  count?: number;
  defaultCollapsed?: boolean;
  description?: ReactNode;
  disabled?: boolean;
  disabledReason?: ReactNode;
  emptyLabel?: ReactNode;
  entries?: readonly WorkbenchExplorerEntryDescriptor[];
  icon?: string;
  id: string;
  kind?: WorkbenchExplorerProviderKind;
  label: ReactNode;
  metadata?: Record<string, unknown>;
  status?: WorkbenchStatus;
}

export interface WorkbenchExplorerEntryRef {
  entryId: string;
  providerId: string;
}

export interface WorkbenchExplorerFlattenedEntry {
  depth: number;
  entry: WorkbenchExplorerEntryDescriptor;
  entryId: string;
  key: string;
  parentEntryIds: readonly string[];
  provider: WorkbenchExplorerProviderDescriptor;
  providerId: string;
}

export interface WorkbenchExplorerEntryContext extends WorkbenchExplorerFlattenedEntry {
  active: boolean;
  expanded: boolean;
  selected: boolean;
}

export interface WorkbenchExplorerEntryContextInput extends WorkbenchExplorerFlattenedEntry {
  activeEntry?: WorkbenchExplorerEntryRef;
  expandedEntries?: Iterable<WorkbenchExplorerEntryRef>;
  selectedEntries?: Iterable<WorkbenchExplorerEntryRef>;
}

export interface WorkbenchExplorerEntrySelectContext extends WorkbenchExplorerEntryContext {
  event: MouseEvent<HTMLButtonElement>;
  reason: 'click';
}

export interface WorkbenchExplorerEntryToggleContext extends WorkbenchExplorerEntryContext {
  event: MouseEvent<HTMLButtonElement>;
  nextExpanded: boolean;
}

export interface WorkbenchExplorerProviderActionContext {
  action: WorkbenchExplorerActionDescriptor;
  event: MouseEvent<HTMLButtonElement>;
  provider: WorkbenchExplorerProviderDescriptor;
  providerId: string;
}

export interface WorkbenchExplorerProviderCollapseContext {
  collapsed: boolean;
  provider: WorkbenchExplorerProviderDescriptor;
  providerId: string;
}

export interface WorkbenchMultiProviderExplorerProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onSelect'
> {
  activeEntry?: WorkbenchExplorerEntryRef;
  defaultExpandedEntries?: Iterable<WorkbenchExplorerEntryRef>;
  emptyLabel?: ReactNode;
  expandedEntries?: Iterable<WorkbenchExplorerEntryRef>;
  onEntrySelect?: (
    entry: WorkbenchExplorerEntryDescriptor,
    context: WorkbenchExplorerEntrySelectContext,
  ) => void;
  onEntryToggle?: (
    entry: WorkbenchExplorerEntryDescriptor,
    context: WorkbenchExplorerEntryToggleContext,
  ) => void;
  onExpandedEntriesChange?: (
    expandedEntries: WorkbenchExplorerEntryRef[],
    context: WorkbenchExplorerEntryToggleContext,
  ) => void;
  onProviderAction?: (
    action: WorkbenchExplorerActionDescriptor,
    context: WorkbenchExplorerProviderActionContext,
  ) => void;
  onProviderCollapsedChange?: (
    provider: WorkbenchExplorerProviderDescriptor,
    context: WorkbenchExplorerProviderCollapseContext,
  ) => void;
  providers: readonly WorkbenchExplorerProviderDescriptor[];
  selectedEntries?: Iterable<WorkbenchExplorerEntryRef>;
}

export function getWorkbenchExplorerEntryKey({ entryId, providerId }: WorkbenchExplorerEntryRef) {
  return `${encodeURIComponent(providerId)}:${encodeURIComponent(entryId)}`;
}

export function normalizeWorkbenchExplorerEntryKeys(
  entries: Iterable<WorkbenchExplorerEntryRef> = [],
) {
  const keys = new Set<string>();

  for (const entry of entries) {
    keys.add(getWorkbenchExplorerEntryKey(entry));
  }

  return keys;
}

export function countWorkbenchExplorerEntries(
  entries: readonly WorkbenchExplorerEntryDescriptor[] = [],
): number {
  return entries.reduce(
    (count, entry) => count + 1 + countWorkbenchExplorerEntries(entry.children),
    0,
  );
}

export function getWorkbenchExplorerProviderEntryCount(
  provider: WorkbenchExplorerProviderDescriptor,
) {
  return provider.count ?? countWorkbenchExplorerEntries(provider.entries);
}

export function isWorkbenchExplorerProviderDisabled(provider: WorkbenchExplorerProviderDescriptor) {
  return Boolean(
    provider.disabled || (provider.status && isWorkbenchStatusDisabled(provider.status)),
  );
}

export function isWorkbenchExplorerEntryDisabled(entry: WorkbenchExplorerEntryDescriptor) {
  return Boolean(entry.disabled || (entry.status && isWorkbenchStatusDisabled(entry.status)));
}

export function isWorkbenchExplorerActionDisabled(
  action: WorkbenchExplorerActionDescriptor,
  providerDisabled = false,
) {
  return Boolean(
    providerDisabled ||
    action.disabled ||
    (action.status && isWorkbenchStatusDisabled(action.status)),
  );
}

export function isWorkbenchExplorerEntrySelectable(entry: WorkbenchExplorerEntryDescriptor) {
  return entry.selectable ?? !entry.children?.length;
}

export function collectWorkbenchExplorerEntryRefs(
  providers: readonly WorkbenchExplorerProviderDescriptor[],
): WorkbenchExplorerEntryRef[] {
  const refs: WorkbenchExplorerEntryRef[] = [];

  const collectEntries = (
    providerId: string,
    entries: readonly WorkbenchExplorerEntryDescriptor[] = [],
  ) => {
    for (const entry of entries) {
      refs.push({ entryId: entry.id, providerId });
      collectEntries(providerId, entry.children);
    }
  };

  for (const provider of providers) {
    collectEntries(provider.id, provider.entries);
  }

  return refs;
}

export function flattenWorkbenchExplorerProviders(
  providers: readonly WorkbenchExplorerProviderDescriptor[],
  expandedEntries: Iterable<WorkbenchExplorerEntryRef> = [],
): WorkbenchExplorerFlattenedEntry[] {
  const expandedEntryKeys = normalizeWorkbenchExplorerEntryKeys(expandedEntries);
  const flattenedEntries: WorkbenchExplorerFlattenedEntry[] = [];

  const flattenEntries = ({
    depth,
    entries = [],
    parentEntryIds,
    provider,
  }: {
    depth: number;
    entries?: readonly WorkbenchExplorerEntryDescriptor[];
    parentEntryIds: readonly string[];
    provider: WorkbenchExplorerProviderDescriptor;
  }) => {
    for (const entry of entries) {
      const key = getWorkbenchExplorerEntryKey({
        entryId: entry.id,
        providerId: provider.id,
      });
      const flattenedEntry: WorkbenchExplorerFlattenedEntry = {
        depth,
        entry,
        entryId: entry.id,
        key,
        parentEntryIds,
        provider,
        providerId: provider.id,
      };

      flattenedEntries.push(flattenedEntry);

      if (entry.children?.length && expandedEntryKeys.has(key)) {
        flattenEntries({
          depth: depth + 1,
          entries: entry.children,
          parentEntryIds: [...parentEntryIds, entry.id],
          provider,
        });
      }
    }
  };

  for (const provider of providers) {
    flattenEntries({ depth: 0, entries: provider.entries, parentEntryIds: [], provider });
  }

  return flattenedEntries;
}

export function getWorkbenchExplorerEntryContext({
  activeEntry,
  expandedEntries,
  selectedEntries,
  ...entry
}: WorkbenchExplorerEntryContextInput): WorkbenchExplorerEntryContext {
  const activeEntryKey = activeEntry ? getWorkbenchExplorerEntryKey(activeEntry) : undefined;
  const expandedEntryKeys = normalizeWorkbenchExplorerEntryKeys(expandedEntries);
  const selectedEntryKeys = normalizeWorkbenchExplorerEntryKeys(selectedEntries);

  return {
    ...entry,
    active: activeEntryKey === entry.key,
    expanded: expandedEntryKeys.has(entry.key),
    selected: selectedEntryKeys.has(entry.key),
  };
}

export function WorkbenchMultiProviderExplorer({
  activeEntry,
  className,
  defaultExpandedEntries = [],
  emptyLabel = 'No explorer providers',
  expandedEntries,
  onEntrySelect,
  onEntryToggle,
  onExpandedEntriesChange,
  onProviderAction,
  onProviderCollapsedChange,
  providers,
  selectedEntries = [],
  ...props
}: WorkbenchMultiProviderExplorerProps) {
  const [uncontrolledExpandedEntryKeys, setUncontrolledExpandedEntryKeys] = useState(() =>
    normalizeWorkbenchExplorerEntryKeys(defaultExpandedEntries),
  );
  const controlledExpandedEntryKeys = useMemo(
    () => (expandedEntries ? normalizeWorkbenchExplorerEntryKeys(expandedEntries) : undefined),
    [expandedEntries],
  );
  const expandedEntryKeys = controlledExpandedEntryKeys ?? uncontrolledExpandedEntryKeys;
  const selectedEntryKeys = useMemo(
    () => normalizeWorkbenchExplorerEntryKeys(selectedEntries),
    [selectedEntries],
  );
  const activeEntryKey = activeEntry ? getWorkbenchExplorerEntryKey(activeEntry) : undefined;
  const allEntryRefs = useMemo(() => collectWorkbenchExplorerEntryRefs(providers), [providers]);

  const entryRefsFromKeys = (keys: Set<string>) =>
    allEntryRefs.filter((entry) => keys.has(getWorkbenchExplorerEntryKey(entry)));

  const createContext = (
    flattenedEntry: WorkbenchExplorerFlattenedEntry,
  ): WorkbenchExplorerEntryContext => ({
    ...flattenedEntry,
    active: activeEntryKey === flattenedEntry.key,
    expanded: expandedEntryKeys.has(flattenedEntry.key),
    selected: selectedEntryKeys.has(flattenedEntry.key),
  });

  const toggleEntry = (
    event: MouseEvent<HTMLButtonElement>,
    flattenedEntry: WorkbenchExplorerFlattenedEntry,
  ) => {
    const context = createContext(flattenedEntry);
    const nextExpanded = !context.expanded;
    const nextExpandedEntryKeys = new Set(expandedEntryKeys);

    if (nextExpanded) {
      nextExpandedEntryKeys.add(flattenedEntry.key);
    } else {
      nextExpandedEntryKeys.delete(flattenedEntry.key);
    }

    const toggleContext: WorkbenchExplorerEntryToggleContext = {
      ...context,
      event,
      nextExpanded,
    };

    if (expandedEntries === undefined) {
      setUncontrolledExpandedEntryKeys(nextExpandedEntryKeys);
    }

    onEntryToggle?.(flattenedEntry.entry, toggleContext);
    onExpandedEntriesChange?.(entryRefsFromKeys(nextExpandedEntryKeys), toggleContext);
  };

  const selectEntry = (
    event: MouseEvent<HTMLButtonElement>,
    flattenedEntry: WorkbenchExplorerFlattenedEntry,
  ) => {
    const context = createContext(flattenedEntry);

    onEntrySelect?.(flattenedEntry.entry, {
      ...context,
      event,
      reason: 'click',
    });
  };

  if (providers.length === 0) {
    return (
      <div
        aria-label={props['aria-label'] ?? 'Workbench explorer'}
        className={cx('ui-workbench-multi-provider-explorer', className)}
        {...props}
      >
        <EmptyState compact icon="codicon-files">
          {emptyLabel}
        </EmptyState>
      </div>
    );
  }

  return (
    <div
      aria-label={props['aria-label'] ?? 'Workbench explorer'}
      className={cx('ui-workbench-multi-provider-explorer', className)}
      role="tree"
      {...props}
    >
      {providers.map((provider) => {
        const providerDisabled = isWorkbenchExplorerProviderDisabled(provider);
        const flattenedEntries = flattenWorkbenchExplorerProviders(
          [provider],
          entryRefsFromKeys(expandedEntryKeys),
        );
        const providerCount = getWorkbenchExplorerProviderEntryCount(provider);

        return (
          <WorkbenchSidebarSection
            key={provider.id}
            actions={
              provider.actions?.length ? (
                <div className="ui-workbench-multi-provider-explorer__provider-actions">
                  {provider.actions.map((action) => {
                    const actionDisabled = isWorkbenchExplorerActionDisabled(
                      action,
                      providerDisabled,
                    );
                    const status = action.status ?? (actionDisabled ? 'disabled' : 'idle');

                    return (
                      <IconButton
                        key={action.id}
                        aria-busy={isWorkbenchStatusBusy(status) ? true : undefined}
                        className="ui-workbench-multi-provider-explorer__provider-action"
                        data-danger={action.danger ? 'true' : undefined}
                        data-status={status}
                        disabled={actionDisabled}
                        icon={action.icon ?? 'codicon-run'}
                        label={action.label}
                        variant={action.danger ? 'danger' : 'default'}
                        onClick={(event) =>
                          onProviderAction?.(action, {
                            action,
                            event,
                            provider,
                            providerId: provider.id,
                          })
                        }
                      />
                    );
                  })}
                </div>
              ) : undefined
            }
            className="ui-workbench-multi-provider-explorer__provider"
            collapsed={provider.collapsed}
            collapsible={provider.collapsible}
            count={providerCount}
            data-disabled={providerDisabled ? 'true' : undefined}
            data-provider-id={provider.id}
            data-provider-kind={provider.kind}
            data-status={provider.status ?? (providerDisabled ? 'disabled' : 'idle')}
            defaultCollapsed={provider.defaultCollapsed}
            title={
              <span className="ui-workbench-multi-provider-explorer__provider-title">
                {provider.icon ? (
                  <i
                    aria-hidden="true"
                    className={cxCodicon(
                      provider.icon,
                      'ui-workbench-multi-provider-explorer__provider-icon',
                    )}
                  />
                ) : null}
                <span>{provider.label}</span>
              </span>
            }
            onCollapsedChange={(collapsed) =>
              onProviderCollapsedChange?.(provider, {
                collapsed,
                provider,
                providerId: provider.id,
              })
            }
          >
            {provider.description || provider.disabledReason ? (
              <div className="ui-workbench-multi-provider-explorer__provider-description">
                {provider.disabledReason ?? provider.description}
              </div>
            ) : null}
            <SideBarList
              aria-label={`${providerLabelText(provider.label)} entries`}
              className="ui-workbench-multi-provider-explorer__entries"
            >
              {flattenedEntries.length === 0 ? (
                <li className="ui-side-bar-list-entry">
                  <div className="ui-workbench-multi-provider-explorer__empty">
                    {provider.emptyLabel ?? 'No entries'}
                  </div>
                </li>
              ) : (
                flattenedEntries.map((flattenedEntry) => {
                  const context = createContext(flattenedEntry);
                  const { entry } = flattenedEntry;
                  const hasChildren = Boolean(entry.children?.length);
                  const entryDisabled = providerDisabled || isWorkbenchExplorerEntryDisabled(entry);
                  const status = entry.status ?? (entryDisabled ? 'disabled' : 'idle');
                  const selectable = isWorkbenchExplorerEntrySelectable(entry);
                  const disabledReasonId = entry.disabledReason
                    ? `${provider.id}-${entry.id}-disabled-reason`
                    : undefined;

                  return (
                    <SideBarListItem
                      key={flattenedEntry.key}
                      active={context.active}
                      aria-busy={isWorkbenchStatusBusy(status) ? true : undefined}
                      aria-describedby={disabledReasonId}
                      aria-expanded={hasChildren ? context.expanded : undefined}
                      className={cx(
                        'ui-workbench-multi-provider-explorer__entry',
                        Boolean(entry.description) &&
                          'ui-workbench-multi-provider-explorer__entry--with-description',
                      )}
                      data-entry-id={entry.id}
                      data-entry-kind={entry.kind}
                      data-entry-path={entry.path}
                      data-provider-id={provider.id}
                      data-status={status}
                      depth={flattenedEntry.depth}
                      disabled={entryDisabled}
                      role="treeitem"
                      selected={context.selected}
                      title={
                        typeof entry.disabledReason === 'string' ? entry.disabledReason : undefined
                      }
                      onClick={(event) => {
                        if (entryDisabled) return;

                        if (hasChildren) {
                          toggleEntry(event, flattenedEntry);
                          return;
                        }

                        if (selectable) {
                          selectEntry(event, flattenedEntry);
                        }
                      }}
                    >
                      <span className="ui-workbench-multi-provider-explorer__entry-prefix">
                        {hasChildren ? (
                          <i
                            aria-hidden="true"
                            className={cxCodicon(
                              context.expanded ? 'chevron-down' : 'chevron-right',
                              'ui-workbench-multi-provider-explorer__entry-chevron',
                            )}
                          />
                        ) : (
                          <span className="ui-workbench-multi-provider-explorer__entry-spacer" />
                        )}
                        {entry.icon ? (
                          <i
                            aria-hidden="true"
                            className={cxCodicon(
                              entry.icon,
                              'ui-workbench-multi-provider-explorer__entry-icon',
                            )}
                          />
                        ) : null}
                      </span>
                      <span className="ui-workbench-multi-provider-explorer__entry-content">
                        <span className="ui-workbench-multi-provider-explorer__entry-label">
                          {entry.label}
                        </span>
                        {entry.description ? (
                          <span className="ui-workbench-multi-provider-explorer__entry-description">
                            {entry.description}
                          </span>
                        ) : null}
                        {entry.disabledReason ? (
                          <span id={disabledReasonId} className="ui-visually-hidden">
                            {entry.disabledReason}
                          </span>
                        ) : null}
                      </span>
                      <span className="ui-workbench-multi-provider-explorer__entry-meta">
                        <span
                          aria-label={getWorkbenchStatusLabel(status)}
                          className="ui-workbench-multi-provider-explorer__entry-status"
                          title={getWorkbenchStatusLabel(status)}
                        >
                          <span
                            aria-hidden="true"
                            className="ui-workbench-multi-provider-explorer__entry-status-dot"
                          />
                        </span>
                      </span>
                    </SideBarListItem>
                  );
                })
              )}
            </SideBarList>
          </WorkbenchSidebarSection>
        );
      })}
    </div>
  );
}

function providerLabelText(label: ReactNode) {
  return typeof label === 'string' ? label : 'Provider';
}
