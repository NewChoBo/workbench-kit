import { useMemo, useState } from 'react';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { ClearableTextInput } from '../../primitives/ClearableTextInput';
import { WorkbenchSettingsSection } from '../settings/WorkbenchSettingsSection';
import { cx } from '../../utils/cx';
import {
  countCommandManagementEntries,
  filterCommandManagementGroups,
} from './build-command-management-groups.js';
import { formatCommandRunState } from './format-command-run-state.js';
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
  const [uncontrolledQuery, setUncontrolledQuery] = useState('');
  const query = controlledQuery ?? uncontrolledQuery;
  const filteredGroups = useMemo(
    () => filterCommandManagementGroups(groups, query),
    [groups, query],
  );
  const totalCount = countCommandManagementEntries(groups);
  const visibleCount = countCommandManagementEntries(filteredGroups);
  const runStateLabel = formatCommandRunState(lastRun);

  return (
    <div className={cx('workbench-management-panel', className)}>
      <WorkbenchSettingsSection
        description="Browse registered commands, review keybindings and menu surfaces, then run a command without opening the palette."
        id="workbench-command-management"
        title="Command Registry"
      >
        <div className="workbench-management-toolbar">
          <ClearableTextInput
            aria-label="Filter commands"
            className="workbench-management-search"
            placeholder="Filter by label, id, category, or menu"
            value={query}
            onChange={(event) => {
              if (controlledQuery === undefined) {
                setUncontrolledQuery(event.currentTarget.value);
              }
            }}
          />
          <p className="workbench-management-summary" role="status">
            {summaryLabel ??
              `${visibleCount} of ${totalCount} command${totalCount === 1 ? '' : 's'} visible`}
          </p>
        </div>

        {runStateLabel ? (
          <p
            aria-live="polite"
            className={cx(
              'workbench-management-run-state',
              lastRun?.status === 'error' && 'workbench-management-run-state--error',
              lastRun?.status === 'running' && 'workbench-management-run-state--running',
            )}
            role="status"
          >
            {lastRun?.status === 'running' ? (
              <i aria-hidden className="codicon codicon-loading codicon-modifier-spin" />
            ) : null}
            <span>{runStateLabel}</span>
          </p>
        ) : null}

        {filteredGroups.length === 0 ? (
          <p className="workbench-management-empty">{emptyLabel}</p>
        ) : (
          <div className="workbench-management-groups">
            {filteredGroups.map((group) => (
              <section
                key={group.id}
                aria-label={group.label}
                className="workbench-management-group"
              >
                <header className="workbench-management-group__header">
                  <h3 className="workbench-management-group__title">{group.label}</h3>
                  <Badge variant="muted">{group.entries.length}</Badge>
                </header>
                <ul className="workbench-management-list">
                  {group.entries.map((entry) => (
                    <li key={entry.id} className="workbench-management-list-item">
                      <div className="workbench-management-list-item__main">
                        <span className="workbench-management-list-item__label">{entry.label}</span>
                        <code className="workbench-management-list-item__id">{entry.id}</code>
                        <div className="workbench-management-list-item__meta">
                          {entry.category ? <Badge variant="muted">{entry.category}</Badge> : null}
                          {entry.keybinding ? (
                            <Badge variant="muted">{entry.keybinding}</Badge>
                          ) : null}
                          <Badge variant={statusBadgeVariant(entry.status)}>
                            {entry.status === 'available' ? 'Runnable' : entry.status}
                          </Badge>
                        </div>
                        {entry.menuSurfaces?.length ? (
                          <p className="workbench-management-list-item__menus">
                            Menus: {entry.menuSurfaces.join(', ')}
                          </p>
                        ) : null}
                      </div>
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
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </WorkbenchSettingsSection>
    </div>
  );
}
