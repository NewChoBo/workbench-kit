import { useMemo, useState } from 'react';
import { formatKeybindingLabel } from '@workbench-kit/platform';
import {
  SideBarHeaderControl,
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
} from '../../layout/SideBarViewFrame';
import { SidebarToolbar } from '../../layout/SidebarToolbar';
import {
  WorkbenchSidebarSectionStack,
} from '../../layout/WorkbenchSidebarSectionStack';
import { Badge } from '../../primitives/Badge';
import { ClearableTextInput } from '../../primitives/ClearableTextInput';
import { EmptyState } from '../../primitives/EmptyState';
import { cx } from '../../utils/cx';
import { countCommandManagementEntries, filterCommandManagementGroups } from './build-command-management-groups.js';
import type { CommandManagementPanelProps } from './types.js';

export interface CommandManagementSidebarProps
  extends Pick<CommandManagementPanelProps, 'groups' | 'lastRun' | 'onRunCommand' | 'summaryLabel'> {
  className?: string | undefined;
  emptyLabel?: string | undefined;
  onRefresh?: (() => void) | undefined;
}

function formatRunState(lastRun: CommandManagementSidebarProps['lastRun']): string | undefined {
  if (!lastRun) {
    return undefined;
  }

  if (lastRun.status === 'running') {
    return `Running ${lastRun.commandId}…`;
  }

  if (lastRun.status === 'error') {
    return lastRun.message ? `Failed: ${lastRun.message}` : `Failed: ${lastRun.commandId}`;
  }

  return `Ran ${lastRun.commandId}`;
}

export function CommandManagementSidebar({
  className,
  emptyLabel = 'No commands match the filter.',
  groups,
  lastRun,
  onRefresh,
  onRunCommand,
  summaryLabel,
}: CommandManagementSidebarProps) {
  const [query, setQuery] = useState('');
  const filteredGroups = useMemo(
    () => filterCommandManagementGroups(groups, query),
    [groups, query],
  );
  const visibleCount = countCommandManagementEntries(filteredGroups);
  const totalCount = countCommandManagementEntries(groups);
  const runStateLabel = formatRunState(lastRun);
  const countLabel = summaryLabel ?? `${visibleCount}/${totalCount}`;

  return (
    <SideBarViewFrame
      actions={
        <SidebarToolbar>
          <Badge variant="muted">{countLabel}</Badge>
          {onRefresh ? (
            <button
              aria-label="Refresh command registry"
              className="ui-icon-button ui-icon-button--compact"
              title="Refresh"
              type="button"
              onClick={onRefresh}
            >
              <i aria-hidden className="codicon codicon-refresh" />
            </button>
          ) : null}
        </SidebarToolbar>
      }
      bodyClassName="ui-side-bar-view__body--dock-sections"
      className={cx('workbench-commands-sidebar', className)}
      footer={
        runStateLabel ? (
          <p
            aria-live="polite"
            className={cx(
              'workbench-commands-sidebar__status',
              lastRun?.status === 'error' && 'workbench-commands-sidebar__status--error',
              lastRun?.status === 'running' && 'workbench-commands-sidebar__status--running',
            )}
            role="status"
          >
            {lastRun?.status === 'running' ? (
              <i aria-hidden className="codicon codicon-loading codicon-modifier-spin" />
            ) : null}
            <span>{runStateLabel}</span>
          </p>
        ) : undefined
      }
      footerPlacement="overlay"
      headerAddon={
        <SideBarHeaderControl>
          <ClearableTextInput
            aria-label="Filter commands"
            clearLabel="Clear filter"
            controlWidth="full"
            placeholder="Filter"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </SideBarHeaderControl>
      }
      title="Commands"
    >
      {filteredGroups.length === 0 ? (
        <EmptyState compact icon="codicon-terminal">
          {emptyLabel}
        </EmptyState>
      ) : filteredGroups.length === 1 ? (
        <SideBarList aria-label="Commands" className="workbench-commands-sidebar__list">
          {filteredGroups[0]?.entries.map((entry) => (
            <CommandSidebarListItem
              key={entry.id}
              disabled={entry.status !== 'available' || !onRunCommand || lastRun?.status === 'running'}
              entry={entry}
              onRun={() => {
                void onRunCommand?.(entry.id);
              }}
            />
          ))}
        </SideBarList>
      ) : (
        <WorkbenchSidebarSectionStack
          items={filteredGroups.map((group) => ({
            children: (
              <SideBarList aria-label={`${group.label} commands`} className="workbench-commands-sidebar__list">
                {group.entries.map((entry) => (
                  <CommandSidebarListItem
                    key={entry.id}
                    disabled={entry.status !== 'available' || !onRunCommand || lastRun?.status === 'running'}
                    entry={entry}
                    onRun={() => {
                      void onRunCommand?.(entry.id);
                    }}
                  />
                ))}
              </SideBarList>
            ),
            defaultCollapsed: filteredGroups.length > 4,
            id: `command-group-${group.id}`,
            title: group.label,
          }))}
        />
      )}
    </SideBarViewFrame>
  );
}

function CommandSidebarListItem({
  disabled,
  entry,
  onRun,
}: {
  disabled: boolean;
  entry: CommandManagementPanelProps['groups'][number]['entries'][number];
  onRun: () => void;
}) {
  const shortcutLabel = entry.keybinding ? formatKeybindingLabel(entry.keybinding) : undefined;

  return (
    <SideBarListItem
      className="workbench-commands-sidebar__item"
      disabled={disabled}
      title={entry.id}
      onClick={onRun}
    >
      <span className="workbench-commands-sidebar__label">{entry.label}</span>
      {shortcutLabel ? (
        <kbd className="workbench-commands-sidebar__shortcut">{shortcutLabel}</kbd>
      ) : null}
    </SideBarListItem>
  );
}
