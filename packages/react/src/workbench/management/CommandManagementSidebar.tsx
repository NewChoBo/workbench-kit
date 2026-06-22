import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { formatKeybindingLabel } from '@workbench-kit/platform';
import {
  SideBarHeaderControl,
  SideBarList,
  SideBarListItem,
  SideBarViewFrame,
} from '../../layout/SideBarViewFrame';
import { SidebarToolbar } from '../../layout/SidebarToolbar';
import { WorkbenchSidebarSectionStack } from '../../layout/WorkbenchSidebarSectionStack';
import { Badge } from '../../primitives/Badge';
import { ClearableTextInput } from '../../primitives/ClearableTextInput';
import { EmptyState } from '../../primitives/EmptyState';
import { IconButton } from '../../primitives/IconButton';
import { cx } from '../../utils/cx';
import {
  countCommandManagementEntries,
  filterCommandManagementGroups,
} from './build-command-management-groups.js';
import { formatCommandRunState } from './format-command-run-state.js';
import type { CommandManagementPanelProps } from './types.js';

const commandManagementListClassName = 'workbench-commands-sidebar__list ui-workbench-scrollbar';
const commandNavigationKeys = new Set([
  'ArrowDown',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
]);

type CommandManagementEntry = CommandManagementPanelProps['groups'][number]['entries'][number];

export interface CommandManagementSidebarProps extends Pick<
  CommandManagementPanelProps,
  'groups' | 'lastRun' | 'onRunCommand' | 'summaryLabel'
> {
  className?: string | undefined;
  emptyLabel?: string | undefined;
  onInspectCommand?: ((commandId: string) => void) | undefined;
  onRefresh?: (() => void) | undefined;
}

export function CommandManagementSidebar({
  className,
  emptyLabel = 'No commands match the filter.',
  groups,
  lastRun,
  onInspectCommand,
  onRefresh,
  onRunCommand,
  summaryLabel,
}: CommandManagementSidebarProps) {
  const [query, setQuery] = useState('');
  const [activeEntryId, setActiveEntryId] = useState<string>();
  const filteredGroups = useMemo(
    () => filterCommandManagementGroups(groups, query),
    [groups, query],
  );
  const canRunCommands = Boolean(onRunCommand) && lastRun?.status !== 'running';
  const runnableEntries = useMemo(
    () =>
      filteredGroups.flatMap((group) =>
        group.entries.filter((entry) => canRunCommands && entry.status === 'available'),
      ),
    [canRunCommands, filteredGroups],
  );
  const visibleCount = countCommandManagementEntries(filteredGroups);
  const totalCount = countCommandManagementEntries(groups);
  const runStateLabel = formatCommandRunState(lastRun);
  const countLabel = summaryLabel ?? `${visibleCount}/${totalCount}`;

  useEffect(() => {
    setActiveEntryId((currentEntryId) => {
      if (currentEntryId && runnableEntries.some((entry) => entry.id === currentEntryId)) {
        return currentEntryId;
      }

      return runnableEntries[0]?.id;
    });
  }, [runnableEntries]);

  const focusCommandEntry = (entryId: string | undefined) => {
    if (!entryId || typeof document === 'undefined') return;

    setActiveEntryId(entryId);
    window.requestAnimationFrame(() => {
      const button = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '.workbench-commands-sidebar [data-command-entry-id]',
        ),
      ).find((candidate) => candidate.dataset.commandEntryId === entryId);

      button?.focus();
      button?.scrollIntoView?.({ block: 'nearest' });
    });
  };

  const getNextEntryId = (currentEntryId: string | undefined, key: string): string | undefined => {
    if (runnableEntries.length === 0) return undefined;

    if (key === 'Home') return runnableEntries[0]?.id;
    if (key === 'End') return runnableEntries[runnableEntries.length - 1]?.id;

    const direction = key === 'ArrowUp' || key === 'PageUp' ? -1 : 1;
    const stepCount = key === 'PageDown' || key === 'PageUp' ? 5 : 1;
    const currentIndex = Math.max(
      0,
      runnableEntries.findIndex((entry) => entry.id === currentEntryId),
    );
    const nextIndex =
      (currentIndex + direction * stepCount + runnableEntries.length) % runnableEntries.length;

    return runnableEntries[nextIndex]?.id;
  };

  const handleFilterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    focusCommandEntry(
      event.key === 'ArrowUp'
        ? runnableEntries[runnableEntries.length - 1]?.id
        : runnableEntries[0]?.id,
    );
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!commandNavigationKeys.has(event.key)) return;

    const currentEntryId =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLButtonElement>('[data-command-entry-id]')?.dataset.commandEntryId
        : undefined;

    event.preventDefault();
    focusCommandEntry(getNextEntryId(currentEntryId ?? activeEntryId, event.key));
  };

  return (
    <SideBarViewFrame
      actions={
        <SidebarToolbar>
          <Badge variant="muted">{countLabel}</Badge>
          {onRefresh ? (
            <IconButton
              compact
              icon="refresh"
              label="Refresh command registry"
              onClick={onRefresh}
            />
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
            onKeyDown={handleFilterKeyDown}
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
        <SideBarList
          aria-label="Commands"
          className={commandManagementListClassName}
          onKeyDown={handleListKeyDown}
        >
          {filteredGroups[0]?.entries.map((entry) => (
            <CommandSidebarListItem
              key={entry.id}
              active={entry.id === activeEntryId}
              disabled={
                entry.status !== 'available' || !onRunCommand || lastRun?.status === 'running'
              }
              entry={entry}
              onActivate={() => setActiveEntryId(entry.id)}
              onInspect={onInspectCommand}
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
              <SideBarList
                aria-label={`${group.label} commands`}
                className={commandManagementListClassName}
                onKeyDown={handleListKeyDown}
              >
                {group.entries.map((entry) => (
                  <CommandSidebarListItem
                    key={entry.id}
                    active={entry.id === activeEntryId}
                    disabled={
                      entry.status !== 'available' || !onRunCommand || lastRun?.status === 'running'
                    }
                    entry={entry}
                    onActivate={() => setActiveEntryId(entry.id)}
                    onInspect={onInspectCommand}
                    onRun={() => {
                      void onRunCommand?.(entry.id);
                    }}
                  />
                ))}
              </SideBarList>
            ),
            id: `command-group-${group.id}`,
            title: group.label,
          }))}
        />
      )}
    </SideBarViewFrame>
  );
}

function CommandSidebarListItem({
  active,
  disabled,
  entry,
  onActivate,
  onInspect,
  onRun,
}: {
  active: boolean;
  disabled: boolean;
  entry: CommandManagementEntry;
  onActivate: () => void;
  onInspect?: ((commandId: string) => void) | undefined;
  onRun: () => void;
}) {
  const shortcutLabel = entry.keybinding ? formatKeybindingLabel(entry.keybinding) : undefined;
  const runClickTimeoutRef = useRef<number | undefined>(undefined);

  const scheduleRun = () => {
    if (runClickTimeoutRef.current !== undefined) {
      window.clearTimeout(runClickTimeoutRef.current);
    }

    runClickTimeoutRef.current = window.setTimeout(() => {
      runClickTimeoutRef.current = undefined;
      onRun();
    }, 220);
  };

  const handleDoubleClick = () => {
    if (runClickTimeoutRef.current !== undefined) {
      window.clearTimeout(runClickTimeoutRef.current);
      runClickTimeoutRef.current = undefined;
    }

    onInspect?.(entry.id);
  };

  useEffect(() => {
    return () => {
      if (runClickTimeoutRef.current !== undefined) {
        window.clearTimeout(runClickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SideBarListItem
      className="workbench-commands-sidebar__item"
      data-command-entry-id={entry.id}
      disabled={disabled}
      selected={active}
      title={onInspect ? `${entry.id} (double-click to inspect)` : entry.id}
      onClick={scheduleRun}
      onDoubleClick={onInspect ? handleDoubleClick : undefined}
      onFocus={onActivate}
      onMouseEnter={onActivate}
    >
      <span className="workbench-commands-sidebar__label">{entry.label}</span>
      {shortcutLabel ? (
        <kbd className="workbench-commands-sidebar__shortcut">{shortcutLabel}</kbd>
      ) : null}
    </SideBarListItem>
  );
}
