import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  filterKeybindingManagementEntries,
  formatKeybindingLabel,
  type KeybindingManagementEntry,
  type WorkbenchShortcutPlatform,
} from '@workbench-kit/platform';
import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import { KeybindingCaptureField } from './KeybindingCaptureField.js';
import {
  ManagementPanelEmptyState,
  ManagementPanelFrame,
  ManagementPanelToolbar,
  useManagementPanelQuery,
} from './ManagementPanelFrame.js';

export interface KeybindingManagementPanelProps {
  className?: string | undefined;
  editingDisabledReason?: string | undefined;
  emptyLabel?: string | undefined;
  entries: readonly KeybindingManagementEntry[];
  onResetKeybinding?: ((commandId: string) => void) | undefined;
  onSetKeybinding?: ((commandId: string, key: string | undefined) => void) | undefined;
  platform?: WorkbenchShortcutPlatform | undefined;
  query?: string | undefined;
  summaryLabel?: string | undefined;
}

export function KeybindingManagementPanel({
  className,
  editingDisabledReason,
  emptyLabel = 'No commands match the current filter.',
  entries,
  onResetKeybinding,
  onSetKeybinding,
  platform,
  query: controlledQuery,
  summaryLabel,
}: KeybindingManagementPanelProps) {
  const editingDisabledReasonId = useId();
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

      {editingDisabledReason ? (
        <p
          className="workbench-management-notice workbench-management-notice--warning"
          id={editingDisabledReasonId}
          role="alert"
        >
          {editingDisabledReason}
        </p>
      ) : null}

      {filteredEntries.length === 0 ? (
        <ManagementPanelEmptyState>{emptyLabel}</ManagementPanelEmptyState>
      ) : (
        <ul className="workbench-management-list">
          {filteredEntries.map((entry) => (
            <KeybindingManagementRow
              key={entry.commandId}
              editingDisabledReason={editingDisabledReason}
              editingDisabledReasonId={editingDisabledReasonId}
              entry={entry}
              onResetKeybinding={onResetKeybinding}
              onSetKeybinding={onSetKeybinding}
              platform={platform}
            />
          ))}
        </ul>
      )}
    </ManagementPanelFrame>
  );
}

function KeybindingManagementRow({
  editingDisabledReason,
  editingDisabledReasonId,
  entry,
  onResetKeybinding,
  onSetKeybinding,
  platform,
}: {
  editingDisabledReason?: string | undefined;
  editingDisabledReasonId: string;
  entry: KeybindingManagementEntry;
  onResetKeybinding?: ((commandId: string) => void) | undefined;
  onSetKeybinding?: ((commandId: string, key: string | undefined) => void) | undefined;
  platform?: WorkbenchShortcutPlatform | undefined;
}) {
  const conflictId = useId();
  const disabledReasonId = useId();
  const rowRef = useRef<HTMLLIElement>(null);
  const [focusResetRequest, setFocusResetRequest] = useState(0);
  const hasOverride = Boolean(entry.userKey);
  const entryDisabledReason =
    entry.editable === false
      ? (entry.disabledReason ?? 'This shortcut cannot be edited here.')
      : undefined;
  const disabledReason = editingDisabledReason ?? entryDisabledReason;
  const captureDisabled = Boolean(disabledReason) || !onSetKeybinding;
  const showReset = hasOverride && Boolean(onResetKeybinding);
  const resetDisabled = Boolean(disabledReason) || entry.editable === false;
  const captureKey = entry.userKey ?? entry.effectiveKey ?? entry.defaultKey;
  const captureLabel =
    entry.effectiveKeyLabel ??
    entry.userKeyLabel ??
    entry.defaultKeyLabel ??
    (captureKey ? formatKeybindingLabel(captureKey) : undefined);
  const conflictMessage = entry.conflictCommandId
    ? `Conflicts with ${entry.conflictCommandId}`
    : undefined;
  const describedBy = [
    editingDisabledReason ? editingDisabledReasonId : undefined,
    entryDisabledReason && !editingDisabledReason ? disabledReasonId : undefined,
    conflictMessage ? conflictId : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (focusResetRequest === 0) {
      return;
    }

    rowRef.current
      ?.querySelector<HTMLButtonElement>('.workbench-keybinding-capture__trigger')
      ?.focus();
  }, [focusResetRequest]);

  return (
    <li
      ref={rowRef}
      className="workbench-management-list-item workbench-management-list-item--responsive"
    >
      <div className="workbench-management-list-item__main">
        <span className="workbench-management-list-item__label">{entry.commandLabel}</span>
        <code className="workbench-management-list-item__id">{entry.commandId}</code>
        <div className="workbench-management-list-item__meta">
          {entry.category ? <Badge variant="muted">{entry.category}</Badge> : null}
          {entry.sourceLabel ? <Badge variant="muted">{entry.sourceLabel}</Badge> : null}
          {entry.defaultKeyLabel && hasOverride ? (
            <Badge variant="muted">Default: {entry.defaultKeyLabel}</Badge>
          ) : null}
          {entry.editable === false
            ? entry.storedKeys?.map((key, index) => (
                <Badge key={`${key}-${index}`} variant="muted">
                  Stored: {formatKeybindingLabel(key)}
                </Badge>
              ))
            : null}
          {conflictMessage ? (
            <Badge id={conflictId} variant="danger">
              {conflictMessage}
            </Badge>
          ) : null}
        </div>
        {entryDisabledReason && !editingDisabledReason ? (
          <p className="workbench-management-list-item__reason" id={disabledReasonId}>
            {entryDisabledReason}
          </p>
        ) : null}
        <span aria-atomic="true" aria-live="polite" className="ui-visually-hidden" role="status">
          {conflictMessage ?? ''}
        </span>
      </div>

      <div className="workbench-management-list-item__actions">
        <KeybindingCaptureField
          ariaDescribedBy={describedBy || undefined}
          ariaLabel={`Keyboard shortcut for ${entry.commandLabel}`}
          disabled={captureDisabled}
          placeholder={captureLabel}
          platform={platform}
          onChange={(key) => {
            if (key === undefined) {
              if (hasOverride) {
                onResetKeybinding?.(entry.commandId);
              }
              return;
            }

            onSetKeybinding?.(entry.commandId, key);
          }}
        />
        {showReset ? (
          <Button
            compact
            disabled={resetDisabled}
            type="button"
            onClick={
              resetDisabled
                ? undefined
                : () => {
                    onResetKeybinding?.(entry.commandId);
                    setFocusResetRequest((current) => current + 1);
                  }
            }
          >
            Reset to default
          </Button>
        ) : null}
      </div>
    </li>
  );
}
