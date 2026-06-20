import { useMemo } from 'react';
import type { KeybindingManagementEntry } from '@workbench-kit/platform';
import { filterKeybindingManagementEntries } from '@workbench-kit/platform';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { KeybindingCaptureField } from './KeybindingCaptureField.js';
import {
  ManagementPanelEmptyState,
  ManagementPanelFrame,
  ManagementPanelToolbar,
  useManagementPanelQuery,
} from './ManagementPanelFrame.js';

export interface KeybindingManagementPanelProps {
  className?: string | undefined;
  emptyLabel?: string | undefined;
  entries: readonly KeybindingManagementEntry[];
  onResetKeybinding?: ((commandId: string) => void) | undefined;
  onSetKeybinding?: ((commandId: string, key: string | undefined) => void) | undefined;
  query?: string | undefined;
  summaryLabel?: string | undefined;
}

export function KeybindingManagementPanel({
  className,
  emptyLabel = 'No commands match the current filter.',
  entries,
  onResetKeybinding,
  onSetKeybinding,
  query: controlledQuery,
  summaryLabel,
}: KeybindingManagementPanelProps) {
  const { query, updateQuery } = useManagementPanelQuery(controlledQuery);
  const filteredEntries = useMemo(
    () => filterKeybindingManagementEntries(entries, query),
    [entries, query],
  );

  return (
    <ManagementPanelFrame
      className={className}
      description="Assign keyboard shortcuts to registered commands. User overrides replace the default binding for that command and persist in this host."
      id="workbench-keybinding-management"
      title="Keyboard Shortcuts"
    >
      <ManagementPanelToolbar
        filterLabel="Filter keyboard shortcuts"
        filterPlaceholder="Filter by command, id, category, or shortcut"
        query={query}
        summary={
          summaryLabel ??
          `${filteredEntries.length} of ${entries.length} command${entries.length === 1 ? '' : 's'} visible`
        }
        onQueryChange={updateQuery}
      />

      {filteredEntries.length === 0 ? (
        <ManagementPanelEmptyState>{emptyLabel}</ManagementPanelEmptyState>
      ) : (
        <ul className="workbench-management-list">
          {filteredEntries.map((entry) => (
            <KeybindingManagementRow
              key={entry.commandId}
              entry={entry}
              onResetKeybinding={onResetKeybinding}
              onSetKeybinding={onSetKeybinding}
            />
          ))}
        </ul>
      )}
    </ManagementPanelFrame>
  );
}

function KeybindingManagementRow({
  entry,
  onResetKeybinding,
  onSetKeybinding,
}: {
  entry: KeybindingManagementEntry;
  onResetKeybinding?: ((commandId: string) => void) | undefined;
  onSetKeybinding?: ((commandId: string, key: string | undefined) => void) | undefined;
}) {
  const hasOverride = Boolean(entry.userKey);
  const canReset = hasOverride && onResetKeybinding;

  return (
    <li className="workbench-management-list-item workbench-management-list-item--responsive">
      <div className="workbench-management-list-item__main">
        <span className="workbench-management-list-item__label">{entry.commandLabel}</span>
        <code className="workbench-management-list-item__id">{entry.commandId}</code>
        <div className="workbench-management-list-item__meta">
          {entry.category ? <Badge variant="muted">{entry.category}</Badge> : null}
          {entry.sourceLabel ? <Badge variant="muted">{entry.sourceLabel}</Badge> : null}
          {entry.defaultKeyLabel && hasOverride ? (
            <Badge variant="muted">Default: {entry.defaultKeyLabel}</Badge>
          ) : null}
          {entry.conflictCommandId ? (
            <Badge variant="danger">Conflicts with {entry.conflictCommandId}</Badge>
          ) : null}
        </div>
      </div>

      <div className="workbench-management-list-item__actions">
        <KeybindingCaptureField
          ariaLabel={`Keyboard shortcut for ${entry.commandLabel}`}
          value={entry.userKey ?? entry.defaultKey}
          onChange={(key) => {
            onSetKeybinding?.(entry.commandId, key);
          }}
        />
        {canReset ? (
          <Button compact type="button" onClick={() => onResetKeybinding(entry.commandId)}>
            Reset
          </Button>
        ) : null}
      </div>
    </li>
  );
}
