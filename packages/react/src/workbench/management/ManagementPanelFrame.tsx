import { useState, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { WorkbenchSettingsSection } from '../settings/WorkbenchSettingsSection';
import { ManagementPanelControls } from './ManagementPanelControls.js';
import type { CommandManagementRunState } from './types.js';
import { formatCommandRunState } from './format-command-run-state.js';

export interface ManagementPanelFrameProps {
  children: ReactNode;
  id: string;
  title: ReactNode;
  className?: string | undefined;
  description?: ReactNode | undefined;
}

export function ManagementPanelFrame({
  children,
  className,
  description,
  id,
  title,
}: ManagementPanelFrameProps) {
  return (
    <div className={cx('workbench-management-panel', className)}>
      <WorkbenchSettingsSection description={description} id={id} title={title}>
        {children}
      </WorkbenchSettingsSection>
    </div>
  );
}

export function useManagementPanelQuery(controlledQuery: string | undefined) {
  const [uncontrolledQuery, setUncontrolledQuery] = useState('');

  return {
    query: controlledQuery ?? uncontrolledQuery,
    updateQuery: controlledQuery === undefined ? setUncontrolledQuery : undefined,
  };
}

export interface ManagementPanelToolbarProps {
  filterLabel: string;
  filterPlaceholder: string;
  query: string;
  summary: ReactNode;
  onQueryChange?: ((query: string) => void) | undefined;
}

export function ManagementPanelToolbar({
  filterLabel,
  filterPlaceholder,
  query,
  summary,
  onQueryChange,
}: ManagementPanelToolbarProps) {
  return (
    <ManagementPanelControls
      filterLabel={filterLabel}
      filterPlaceholder={filterPlaceholder}
      query={query}
      summary={summary}
      onQueryChange={onQueryChange}
    />
  );
}

export function ManagementPanelSummary({ children }: { children: ReactNode }) {
  return (
    <p className="workbench-management-summary" role="status">
      {children}
    </p>
  );
}

export function ManagementPanelEmptyState({ children }: { children: ReactNode }) {
  return <p className="workbench-management-empty">{children}</p>;
}

export function ManagementPanelNotice({ children }: { children: ReactNode }) {
  return <p className="workbench-management-notice">{children}</p>;
}

export function ManagementPanelRunState({
  lastRun,
}: {
  lastRun: CommandManagementRunState | undefined;
}) {
  const runStateLabel = formatCommandRunState(lastRun);
  if (!runStateLabel) {
    return null;
  }

  return (
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
  );
}
