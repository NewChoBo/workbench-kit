import { formatKeybindingLabel } from '@workbench-kit/platform';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { cx } from '../../utils/cx';
import { formatCommandRunState } from './format-command-run-state.js';
import { ManagementPanelFrame, ManagementPanelRunState } from './ManagementPanelFrame.js';
import type { CommandManagementEntry, CommandManagementRunState } from './types.js';

function statusBadgeVariant(status: CommandManagementEntry['status']) {
  switch (status) {
    case 'available':
      return 'accent' as const;
    case 'disabled':
      return 'muted' as const;
    default:
      return 'danger' as const;
  }
}

export interface CommandInspectorPanelProps {
  className?: string | undefined;
  entry: CommandManagementEntry;
  lastRun?: CommandManagementRunState | undefined;
  onRunCommand?: ((commandId: string) => void | Promise<void>) | undefined;
}

export function CommandInspectorPanel({
  className,
  entry,
  lastRun,
  onRunCommand,
}: CommandInspectorPanelProps) {
  const shortcutLabel = entry.keybinding ? formatKeybindingLabel(entry.keybinding) : undefined;
  const runStateLabel =
    lastRun?.commandId === entry.id ? formatCommandRunState(lastRun) : undefined;
  const canRun =
    entry.status === 'available' && Boolean(onRunCommand) && lastRun?.status !== 'running';

  return (
    <ManagementPanelFrame
      className={cx('workbench-command-inspector', className)}
      description="Inspect command metadata, menu surfaces, and run the handler from the editor area."
      id={`workbench-command-inspector-${entry.id}`}
      title={entry.label}
    >
      <div className="workbench-command-inspector__toolbar">
        <div className="workbench-command-inspector__badges">
          {entry.category ? <Badge variant="muted">{entry.category}</Badge> : null}
          <Badge variant={statusBadgeVariant(entry.status)}>
            {entry.status === 'available' ? 'Runnable' : entry.status}
          </Badge>
          <Badge variant="muted">{entry.sourceLabel}</Badge>
        </div>
        <Button
          disabled={!canRun}
          type="button"
          onClick={() => {
            void onRunCommand?.(entry.id);
          }}
        >
          Run command
        </Button>
      </div>

      {runStateLabel ? (
        <p
          aria-live="polite"
          className={cx(
            'workbench-command-inspector__status',
            lastRun?.status === 'error' && 'workbench-command-inspector__status--error',
            lastRun?.status === 'running' && 'workbench-command-inspector__status--running',
          )}
          role="status"
        >
          {lastRun?.status === 'running' ? (
            <i aria-hidden className="codicon codicon-loading codicon-modifier-spin" />
          ) : null}
          <span>{runStateLabel}</span>
        </p>
      ) : (
        <ManagementPanelRunState lastRun={lastRun?.commandId === entry.id ? lastRun : undefined} />
      )}

      <dl className="workbench-command-inspector__details">
        <div className="workbench-command-inspector__detail">
          <dt>Command ID</dt>
          <dd>
            <code>{entry.id}</code>
          </dd>
        </div>
        {entry.description ? (
          <div className="workbench-command-inspector__detail">
            <dt>Description</dt>
            <dd>{entry.description}</dd>
          </div>
        ) : null}
        <div className="workbench-command-inspector__detail">
          <dt>Source</dt>
          <dd>
            {entry.sourceLabel}{' '}
            <span className="workbench-command-inspector__subtle">({entry.source})</span>
          </dd>
        </div>
        {shortcutLabel ? (
          <div className="workbench-command-inspector__detail">
            <dt>Keybinding</dt>
            <dd>
              <kbd>{shortcutLabel}</kbd>
            </dd>
          </div>
        ) : null}
        {entry.menuSurfaces && entry.menuSurfaces.length > 0 ? (
          <div className="workbench-command-inspector__detail">
            <dt>Menu surfaces</dt>
            <dd>
              <ul className="workbench-command-inspector__menu-list">
                {entry.menuSurfaces.map((surface) => (
                  <li key={surface}>{surface}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>
    </ManagementPanelFrame>
  );
}
