import { useMemo, useState } from 'react';
import type { KeybindingManagementEntry } from '@workbench-kit/platform';
import { filterKeybindingManagementEntries } from '@workbench-kit/platform';
import { Badge } from '../../primitives/Badge';
import { Button } from '../../primitives/Button';
import { ClearableTextInput } from '../../primitives/ClearableTextInput';
import { WorkbenchSettingsSection } from '../settings/WorkbenchSettingsSection';
import { cx } from '../../utils/cx';
import { KeybindingCaptureField } from './KeybindingCaptureField.js';

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
  const [uncontrolledQuery, setUncontrolledQuery] = useState('');
  const query = controlledQuery ?? uncontrolledQuery;
  const filteredEntries = useMemo(
    () => filterKeybindingManagementEntries(entries, query),
    [entries, query],
  );

  return (
    <div className={cx('workbench-management-panel', className)}>
      <WorkbenchSettingsSection
        description="Assign keyboard shortcuts to registered commands. User overrides replace the default binding for that command and persist in this host."
        id="workbench-keybinding-management"
        title="Keyboard Shortcuts"
      >
        <div className="workbench-management-toolbar">
          <ClearableTextInput
            aria-label="Filter keyboard shortcuts"
            className="workbench-management-search"
            placeholder="Filter by command, id, category, or shortcut"
            value={query}
            onChange={(event) => {
              if (controlledQuery === undefined) {
                setUncontrolledQuery(event.currentTarget.value);
              }
            }}
          />
          <p className="workbench-management-summary" role="status">
            {summaryLabel ??
              `${filteredEntries.length} of ${entries.length} command${entries.length === 1 ? '' : 's'} visible`}
          </p>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="workbench-management-empty">{emptyLabel}</p>
        ) : (
          <ul className="workbench-keybinding-list">
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
      </WorkbenchSettingsSection>
    </div>
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
    <li className="workbench-keybinding-list-item">
      <div className="workbench-keybinding-list-item__main">
        <span className="workbench-keybinding-list-item__label">{entry.commandLabel}</span>
        <code className="workbench-keybinding-list-item__id">{entry.commandId}</code>
        <div className="workbench-keybinding-list-item__meta">
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

      <div className="workbench-keybinding-list-item__actions">
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
