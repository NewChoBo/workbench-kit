import { useMemo } from 'react';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import {
  countCommandManagementEntries,
  filterCommandManagementGroups,
} from './build-command-management-groups.js';
import { ManagementCard, ManagementCardList } from './ManagementCard.js';
import { ManagementGroup, ManagementGroups } from './ManagementGroup.js';
import {
  ManagementPanelEmptyState,
  ManagementPanelFrame,
  ManagementPanelRunState,
  ManagementPanelToolbar,
  useManagementPanelQuery,
} from './ManagementPanelFrame.js';
import type { CommandManagementPanelProps } from './types.js';

function statusBadgeVariant(
  status: CommandManagementPanelProps['groups'][number]['entries'][number]['status'],
) {
  switch (status) {
    case 'available':
      return 'accent' as const;
    case 'disabled':
      return 'muted' as const;
    default:
      return 'danger' as const;
  }
}

export function CommandManagementPanel({
  className,
  emptyLabel = 'No commands match the current filter.',
  groups,
  lastRun,
  onRunCommand,
  query: controlledQuery,
  summaryLabel,
}: CommandManagementPanelProps) {
  const { query, updateQuery } = useManagementPanelQuery(controlledQuery);
  const filteredGroups = useMemo(
    () => filterCommandManagementGroups(groups, query),
    [groups, query],
  );
  const totalCount = countCommandManagementEntries(groups);
  const visibleCount = countCommandManagementEntries(filteredGroups);

  return (
    <ManagementPanelFrame
      className={className}
      description="Browse registered commands, review keybindings and menu surfaces, then run a command without opening the palette."
      id="workbench-command-management"
      title="Command Registry"
    >
      <ManagementPanelToolbar
        filterLabel="Filter commands"
        filterPlaceholder="Filter by label, id, category, or menu"
        query={query}
        summary={
          summaryLabel ??
          `${visibleCount} of ${totalCount} command${totalCount === 1 ? '' : 's'} visible`
        }
        onQueryChange={updateQuery}
      />

      <ManagementPanelRunState lastRun={lastRun} />

      {filteredGroups.length === 0 ? (
        <ManagementPanelEmptyState>{emptyLabel}</ManagementPanelEmptyState>
      ) : (
        <ManagementGroups>
          {filteredGroups.map((group) => (
            <ManagementGroup
              key={group.id}
              count={group.entries.length}
              label={group.label}
              labelId={`workbench-command-group-${group.id}`}
              variant="section"
            >
              <ManagementCardList>
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <ManagementCard
                      actions={
                        <Button
                          disabled={
                            entry.status !== 'available' ||
                            !onRunCommand ||
                            lastRun?.status === 'running'
                          }
                          type="button"
                          onClick={() => {
                            void onRunCommand?.(entry.id);
                          }}
                        >
                          Run
                        </Button>
                      }
                      badges={
                        <>
                          {entry.category ? <Badge variant="muted">{entry.category}</Badge> : null}
                          {entry.keybinding ? (
                            <Badge variant="muted">{entry.keybinding}</Badge>
                          ) : null}
                          <Badge variant={statusBadgeVariant(entry.status)}>
                            {entry.status === 'available' ? 'Runnable' : entry.status}
                          </Badge>
                        </>
                      }
                      description={
                        entry.menuSurfaces?.length
                          ? `Menus: ${entry.menuSurfaces.join(', ')}`
                          : undefined
                      }
                      id={entry.id}
                      layout="row"
                      title={entry.label}
                    />
                  </li>
                ))}
              </ManagementCardList>
            </ManagementGroup>
          ))}
        </ManagementGroups>
      )}
    </ManagementPanelFrame>
  );
}
