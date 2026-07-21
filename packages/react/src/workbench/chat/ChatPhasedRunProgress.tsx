import { useId, useState, type ReactNode } from 'react';

import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import { cx } from '../../utils/cx';
import {
  getWorkbenchStatusDescriptor,
  type WorkbenchStatus,
  type WorkbenchStatusVariant,
} from '../status';

/** Product-neutral phase lifecycle for run-progress UIs. */
export type ChatRunPhaseStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface ChatRunPhase {
  readonly id: string;
  readonly label: string;
  readonly status: ChatRunPhaseStatus;
  /** Optional detail line (path, count, error summary — host-owned copy). */
  readonly detail?: string;
}

export interface ChatPhasedRunProgressAction {
  readonly id: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly variant?: 'default' | 'primary' | 'danger';
}

function toBadgeVariant(
  variant: WorkbenchStatusVariant,
): 'accent' | 'muted' | 'danger' {
  if (variant === 'danger' || variant === 'warning') {
    return 'danger';
  }
  if (variant === 'muted' || variant === 'neutral') {
    return 'muted';
  }
  return 'accent';
}

export interface ChatPhasedRunProgressProps {
  readonly title?: string;
  readonly phases: readonly ChatRunPhase[];
  /** Controlled expand state; omit for uncontrolled default. */
  readonly expanded?: boolean;
  readonly defaultExpanded?: boolean;
  readonly onExpandedChange?: (expanded: boolean) => void;
  readonly actions?: readonly ChatPhasedRunProgressAction[];
  /** Extra footer content (host-owned). */
  readonly footer?: ReactNode;
  readonly className?: string;
}

function mapPhaseStatusToWorkbenchStatus(status: ChatRunPhaseStatus): WorkbenchStatus {
  switch (status) {
    case 'pending':
      return 'waiting';
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'idle';
    case 'cancelled':
      return 'cancelled';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function summarizePhases(phases: readonly ChatRunPhase[]): {
  label: string;
  status: ChatRunPhaseStatus;
} {
  if (phases.some((phase) => phase.status === 'failed')) {
    return { label: 'Failed', status: 'failed' };
  }
  if (phases.some((phase) => phase.status === 'running')) {
    return { label: 'Running', status: 'running' };
  }
  if (phases.some((phase) => phase.status === 'cancelled')) {
    return { label: 'Cancelled', status: 'cancelled' };
  }
  if (phases.length > 0 && phases.every((phase) => phase.status === 'completed' || phase.status === 'skipped')) {
    return { label: 'Completed', status: 'completed' };
  }
  return { label: 'Pending', status: 'pending' };
}

/**
 * Product-neutral phased run-progress chrome for chat footers / hybrid timelines.
 * Hosts own phase ids, copy, and action handlers — no workflow semantics in kit.
 */
export function ChatPhasedRunProgress({
  title = 'Run progress',
  phases,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  actions,
  footer,
  className,
}: ChatPhasedRunProgressProps) {
  const panelId = useId();
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? uncontrolledExpanded;
  const summary = summarizePhases(phases);
  const summaryDescriptor = getWorkbenchStatusDescriptor(
    mapPhaseStatusToWorkbenchStatus(summary.status),
  );

  const setExpanded = (next: boolean) => {
    if (expanded === undefined) {
      setUncontrolledExpanded(next);
    }
    onExpandedChange?.(next);
  };

  return (
    <section
      className={cx('chat-phased-run-progress', className)}
      data-expanded={isExpanded ? 'true' : 'false'}
      data-status={summary.status}
    >
      <header className="chat-phased-run-progress__header">
        <div className="chat-phased-run-progress__title-group">
          <h3 className="chat-phased-run-progress__title">{title}</h3>
          <Badge variant={toBadgeVariant(summaryDescriptor.variant)}>{summary.label}</Badge>
        </div>
        <Button
          type="button"
          variant="default"
          compact
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={() => setExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </header>

      {isExpanded ? (
        <ol id={panelId} className="chat-phased-run-progress__phases">
          {phases.map((phase) => {
            const descriptor = getWorkbenchStatusDescriptor(
              mapPhaseStatusToWorkbenchStatus(phase.status),
            );
            return (
              <li
                key={phase.id}
                className="chat-phased-run-progress__phase"
                data-phase-id={phase.id}
                data-status={phase.status}
              >
                <div className="chat-phased-run-progress__phase-main">
                  <span className="chat-phased-run-progress__phase-label">{phase.label}</span>
                  <Badge variant={toBadgeVariant(descriptor.variant)}>{descriptor.label}</Badge>
                </div>
                {phase.detail ? (
                  <p className="chat-phased-run-progress__phase-detail">{phase.detail}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="chat-phased-run-progress__summary" id={panelId}>
          {phases.length === 0
            ? 'No phases'
            : `${phases.filter((phase) => phase.status === 'completed' || phase.status === 'skipped').length}/${phases.length} phases complete`}
        </p>
      )}

      {actions && actions.length > 0 ? (
        <div className="chat-phased-run-progress__actions">
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              compact
              variant={action.variant ?? 'default'}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}

      {footer ? <div className="chat-phased-run-progress__footer">{footer}</div> : null}
    </section>
  );
}
